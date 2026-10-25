import { randomBytes } from "node:crypto";
import type { Workspace, WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { logActivity, notify } from "@/lib/activity";
import { outranks } from "@/lib/permissions";
import { requireMembership, requirePermission } from "@/lib/authz";
import { slugify } from "@/lib/slug";

async function uniqueSlug(base: string): Promise<string> {
  const slug = slugify(base) || "workspace";
  let candidate = slug;
  let i = 2;
  while (await prisma.workspace.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${i++}`;
  }
  return candidate;
}

export async function createWorkspace(userId: string, name: string): Promise<Workspace> {
  const slug = await uniqueSlug(name);
  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
    },
  });
  await logActivity({
    workspaceId: workspace.id,
    actorId: userId,
    action: "workspace.created",
    entityType: "workspace",
    entityId: workspace.id,
    metadata: { name },
  });
  return workspace;
}

export async function listWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ ...m.workspace, role: m.role }));
}

export async function getWorkspace(userId: string, workspaceId: string) {
  const membership = await requireMembership(userId, workspaceId);
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
  });
  return { workspace, role: membership.role };
}

export async function updateWorkspace(userId: string, workspaceId: string, name: string) {
  await requirePermission(userId, workspaceId, "workspace.update");
  return prisma.workspace.update({ where: { id: workspaceId }, data: { name } });
}

export async function deleteWorkspace(userId: string, workspaceId: string) {
  await requirePermission(userId, workspaceId, "workspace.delete");
  await prisma.workspace.delete({ where: { id: workspaceId } });
}

export async function transferOwnership(
  userId: string,
  workspaceId: string,
  newOwnerId: string,
) {
  const actor = await requirePermission(userId, workspaceId, "workspace.transferOwnership");
  if (newOwnerId === userId) throw badRequest("You already own this workspace.");
  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: newOwnerId } },
  });
  if (!target) throw badRequest("The new owner must be a workspace member.");
  await prisma.$transaction([
    prisma.workspaceMember.update({
      where: { id: target.id },
      data: { role: "OWNER" },
    }),
    prisma.workspaceMember.update({
      where: { id: actor.id },
      data: { role: "ADMIN" },
    }),
    prisma.workspace.update({
      where: { id: workspaceId },
      data: { ownerId: newOwnerId },
    }),
  ]);
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "workspace.ownershipTransferred",
    entityType: "workspace",
    entityId: workspaceId,
    metadata: { newOwnerId },
  });
}

export async function listMembers(userId: string, workspaceId: string) {
  await requirePermission(userId, workspaceId, "member.list");
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function inviteMember(
  userId: string,
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
) {
  const actor = await requirePermission(userId, workspaceId, "member.invite");
  if (role === "OWNER") throw badRequest("Invites cannot grant the OWNER role.");
  if (!outranks(actor.role, role) && actor.role !== "OWNER") {
    throw forbidden("You cannot invite someone at or above your own role.");
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const already = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
    });
    if (already) throw conflict("That user is already a member of this workspace.");
  }
  const pending = await prisma.invite.findFirst({
    where: { workspaceId, email, status: "PENDING" },
  });
  if (pending) throw conflict("There is already a pending invite for that email.");

  const invite = await prisma.invite.create({
    data: {
      workspaceId,
      email,
      role,
      token: randomBytes(24).toString("hex"),
      invitedById: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "member.invited",
    entityType: "invite",
    entityId: invite.id,
    metadata: { email, role },
  });
  return invite;
}

/** Accept an invite: the signed-in user's email must match the invite. */
export async function acceptInvite(userId: string, userEmail: string, token: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.status !== "PENDING") throw notFound("Invite not found.");
  if (invite.expiresAt < new Date()) throw badRequest("This invite has expired.");
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw forbidden("This invite was sent to a different email address.");
  }
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
  });
  if (existing) throw conflict("You are already a member of this workspace.");

  const member = await prisma.workspaceMember.create({
    data: { workspaceId: invite.workspaceId, userId, role: invite.role },
  });
  await prisma.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
  await logActivity({
    workspaceId: invite.workspaceId,
    actorId: userId,
    action: "member.joined",
    entityType: "workspace",
    entityId: invite.workspaceId,
    metadata: { viaInvite: true },
  });
  await notify({
    workspaceId: invite.workspaceId,
    recipientId: invite.invitedById,
    actorId: userId,
    type: "INVITE_ACCEPTED",
    title: `${userEmail} accepted your invite`,
  });
  return member;
}

export async function listInvites(userId: string, workspaceId: string) {
  await requirePermission(userId, workspaceId, "member.invite");
  return prisma.invite.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeInvite(userId: string, workspaceId: string, inviteId: string) {
  await requirePermission(userId, workspaceId, "member.invite");
  const invite = await prisma.invite.findFirst({ where: { id: inviteId, workspaceId } });
  if (!invite) throw notFound("Invite not found.");
  await prisma.invite.update({ where: { id: inviteId }, data: { status: "REVOKED" } });
}

export async function updateMemberRole(
  userId: string,
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole,
) {
  const actor = await requirePermission(userId, workspaceId, "member.updateRole");
  if (role === "OWNER") {
    throw badRequest("Use ownership transfer to make someone the owner.");
  }
  const target = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  });
  if (!target) throw notFound("Member not found.");
  if (target.role === "OWNER") throw forbidden("The owner's role cannot be changed.");
  if (actor.role !== "OWNER" && !outranks(actor.role, target.role)) {
    throw forbidden("You cannot change the role of someone at or above your level.");
  }
  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "member.roleUpdated",
    entityType: "member",
    entityId: memberId,
    metadata: { role },
  });
  return updated;
}

export async function removeMember(userId: string, workspaceId: string, memberId: string) {
  const actor = await requirePermission(userId, workspaceId, "member.remove");
  const target = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  });
  if (!target) throw notFound("Member not found.");
  if (target.role === "OWNER") throw forbidden("The workspace owner cannot be removed.");
  if (target.userId !== userId && actor.role !== "OWNER" && !outranks(actor.role, target.role)) {
    throw forbidden("You cannot remove someone at or above your level.");
  }
  await prisma.workspaceMember.delete({ where: { id: memberId } });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "member.removed",
    entityType: "member",
    entityId: memberId,
  });
}

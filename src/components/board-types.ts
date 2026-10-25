export interface BoardTask {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  position: number;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  commentCount: number;
}

export interface BoardColumnData {
  id: string;
  name: string;
  position: number;
  tasks: BoardTask[];
}

export interface MemberOption {
  userId: string;
  name: string;
  email: string;
  role: string;
}

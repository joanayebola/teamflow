#!/usr/bin/env bash
# Teamflow smoke test: register -> login -> workspace -> project -> task -> move.
# Requires the app running on $BASE (default http://localhost:3000) with the demo seed applied.
set -u
BASE="${BASE:-http://localhost:3000}"
JAR="$(mktemp)"
JAR2="$(mktemp)"
PASS=0; FAIL=0
check() { # name condition
  if [ "$2" = "0" ]; then echo "PASS: $1"; PASS=$((PASS+1)); else echo "FAIL: $1"; FAIL=$((FAIL+1)); fi
}

echo "== unauthenticated guard =="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/workspaces")
[ "$CODE" = "401" ]; check "GET /api/workspaces without session -> 401 (got $CODE)" $?
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/app")
[ "$CODE" = "307" ] || [ "$CODE" = "302" ]; check "GET /app without session redirects (got $CODE)" $?

echo "== register a fresh user =="
EMAIL="smoke-$(date +%s)@test.dev"
REG=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Tester\",\"email\":\"$EMAIL\",\"password\":\"smoke-password-1\"}")
CODE=$(echo "$REG" | tail -1)
[ "$CODE" = "201" ]; check "register -> 201 (got $CODE)" $?

echo "== login via Auth.js credentials callback =="
CSRF=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF" --data-urlencode "email=$EMAIL" --data-urlencode "password=smoke-password-1")
[ "$LOGIN_CODE" = "302" ] || [ "$LOGIN_CODE" = "303" ] || [ "$LOGIN_CODE" = "200" ]; check "credentials login (got $LOGIN_CODE)" $?
SESSION=$(curl -s -b "$JAR" "$BASE/api/auth/session")
echo "$SESSION" | grep -q "$EMAIL"; check "session contains the new user" $?

echo "== create workspace + project =="
WS=$(curl -s -b "$JAR" -X POST "$BASE/api/workspaces" -H 'Content-Type: application/json' -d '{"name":"Smoke Workspace"}')
WSID=$(echo "$WS" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
[ -n "$WSID" ]; check "workspace created ($WSID)" $?
PROJ=$(curl -s -b "$JAR" -X POST "$BASE/api/workspaces/$WSID/projects" -H 'Content-Type: application/json' -d '{"name":"Smoke Project","key":"SMK"}')
PID=$(echo "$PROJ" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
[ -n "$PID" ]; check "project created ($PID)" $?

echo "== board, task create + move =="
BOARD=$(curl -s -b "$JAR" "$BASE/api/projects/$PID/board")
COL1=$(echo "$BOARD" | python3 -c "import sys,json;print(json.load(sys.stdin)['board']['columns'][0]['id'])")
COL2=$(echo "$BOARD" | python3 -c "import sys,json;print(json.load(sys.stdin)['board']['columns'][1]['id'])")
NCOLS=$(echo "$BOARD" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['board']['columns']))")
[ "$NCOLS" = "4" ]; check "project board has 4 default columns (got $NCOLS)" $?
TASK=$(curl -s -b "$JAR" -X POST "$BASE/api/tasks" -H 'Content-Type: application/json' -d "{\"columnId\":\"$COL1\",\"title\":\"Smoke task\",\"priority\":\"HIGH\"}")
TID=$(echo "$TASK" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
[ -n "$TID" ]; check "task created ($TID)" $?
MOVE=$(curl -s -b "$JAR" -X POST "$BASE/api/tasks/$TID/move" -H 'Content-Type: application/json' -d "{\"targetColumnId\":\"$COL2\",\"targetIndex\":0}")
echo "$MOVE" | grep -q "\"columnId\":\"$COL2\""; check "task moved to column 2" $?
BOARD2=$(curl -s -b "$JAR" "$BASE/api/projects/$PID/board")
echo "$BOARD2" | python3 -c "
import sys, json
cols = json.load(sys.stdin)['board']['columns']
in_col2 = any(t['title'] == 'Smoke task' for t in cols[1]['tasks'])
in_col1 = any(t['title'] == 'Smoke task' for t in cols[0]['tasks'])
sys.exit(0 if in_col2 and not in_col1 else 1)
"; check "move persisted (task in col2, not col1)" $?

echo "== demo owner session: seeded data visible =="
CSRF2=$(curl -s -c "$JAR2" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -o /dev/null -b "$JAR2" -c "$JAR2" -X POST "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF2" --data-urlencode "email=owner@teamflow.demo" --data-urlencode "password=demo-password-123"
WSLIST=$(curl -s -b "$JAR2" "$BASE/api/workspaces")
echo "$WSLIST" | grep -q "Demo Workspace"; check "demo owner sees Demo Workspace" $?
DEMO_WSID=$(echo "$WSLIST" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")
ANALYTICS=$(curl -s -b "$JAR2" "$BASE/api/workspaces/$DEMO_WSID/analytics")
echo "$ANALYTICS" | grep -q '"totalTasks":10'; check "analytics reports 10 seeded tasks" $?
ACT=$(curl -s -b "$JAR2" "$BASE/api/workspaces/$DEMO_WSID/activity?pageSize=5")
echo "$ACT" | grep -q '"total"'; check "activity endpoint returns paginated payload" $?
SEARCH=$(curl -s -b "$JAR2" "$BASE/api/workspaces/$DEMO_WSID/search?q=analytics")
echo "$SEARCH" | grep -q "Audit current site analytics"; check "search finds seeded task by title" $?

echo "== wrong password is rejected =="
CSRF3=$(curl -s -c "$JAR2" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -o /dev/null -b "$JAR2" -c "$JAR2" -X POST "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF3" --data-urlencode "email=owner@teamflow.demo" --data-urlencode "password=wrong-password"
BADSESSION=$(curl -s -b "$JAR2" "$BASE/api/auth/session")
# A failed login must not yield a session for the demo owner on this fresh jar flow:
echo "$BADSESSION" | grep -q "null" ; check "wrong password yields no new session payload" $?

rm -f "$JAR" "$JAR2"
echo ""
echo "SMOKE RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]

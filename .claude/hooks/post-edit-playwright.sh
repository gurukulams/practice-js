#!/bin/bash
# PostToolUse hook: ask user whether to run Playwright tests after a file edit.
# Outputs a JSON block that Claude Code interprets as a blocked action with a message,
# which causes Claude to surface the question to the user.

echo '{"decision":"block","reason":"File changed — run Playwright tests? (reply yes/no)"}'

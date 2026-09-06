#!/bin/bash
while true; do
  STATUS=$(gh pr checks 427 | grep -i "Workers Builds")
  if echo "$STATUS" | grep -q "pending"; then
    echo "Still pending..."
    sleep 10
  else
    echo "Finished!"
    echo "$STATUS"
    exit 0
  fi
done

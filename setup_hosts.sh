#!/bin/bash

HOSTS_FILE="/etc/hosts"
IP="127.0.0.1"
HOSTNAMES=("epic-stack.me" "docs.epic-stack.me" "studio.epic-stack.me")

echo "This script will add entries to your /etc/hosts file for local development."
echo "Sudo password may be required."

for hostname in "${HOSTNAMES[@]}"; do
    if ! grep -q -E "^\s*$IP\s+$hostname\s*$" "$HOSTS_FILE"; then
        sudo -- sh -c -e "echo '$IP $hostname' >> $HOSTS_FILE"
        echo "Added '$IP $hostname' to $HOSTS_FILE"
    else
        echo "Entry for '$hostname' already exists in $HOSTS_FILE"
    fi
done

echo "Done."

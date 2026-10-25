#!/usr/bin/env bash
# scripts/oracle-a1-retry.sh — Get an OCI Ampere A1 instance, retrying on OutOfHostCapacity.
#
# Run in OCI Cloud Shell (top-right ">_" button in the Console).
# Pre-authenticated, OCI CLI + jq + ssh-keygen already installed.
#
# Self-contained: creates VCN + public subnet + security rules if missing.
# Loop runs until the instance is created (or you Ctrl-C).
#
# Usage:  bash oracle-a1-retry.sh [PATH_TO_SSH_PUB_KEY]
#   No key arg  -> generates an ed25519 keypair at $HOME/oracle-vm-keys/
#   Provide key -> uses your existing SSH public key file
set -euo pipefail

echo "============================================"
echo " Sentinel SaaS — Oracle A1 Instance Retry"
echo "============================================"

INTERVAL=120          # seconds between retries (Oracle may need minutes/hours)
OCPU=2               # Always Free limit since 2026: 2 OCPU (more is billed on Pay As You Go)
MEM_GB=12            # Always Free limit since 2026: 12 GB RAM
BOOT_GB=50           # boot volume size
VM_NAME="sentinel-vm"

# --- SSH Key handling ---
USER_KEY="${1:-}"
KEY_DIR="$HOME/oracle-vm-keys"
KEY_FILE="$KEY_DIR/oracle_key"

if [ -n "$USER_KEY" ]; then
  if [ ! -f "$USER_KEY" ]; then
    echo "ERROR: SSH public key not found: $USER_KEY"
    exit 1
  fi
  SSH_PUB_KEY_PATH="$USER_KEY"
  echo "SSH key (user-provided): $SSH_PUB_KEY_PATH"
else
  if [ ! -f "$KEY_FILE.pub" ]; then
    echo "No SSH key specified — generating ed25519 keypair..."
    mkdir -p "$KEY_DIR"
    ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -C "$VM_NAME" -q
    echo "✅ Keypair generated: $KEY_FILE (private)"
  else
    echo "✅ Existing keypair: $KEY_FILE"
  fi
  SSH_PUB_KEY_PATH="$KEY_FILE.pub"
fi

# --- Identity & compartment (root tenancy) ---
TENANCY=$(oci iam tenancy get --query 'data.id' --raw-output)
echo "Tenancy: $TENANCY"

# Check root tenancy has subcompartments
ROOT_COMPARTMENT=$TENANCY
SUB_COMPARTMENTS=$(oci iam compartment list --query "data[?\"lifecycle-state\"=='ACTIVE'] | length(@)" --raw-output 2>/dev/null || echo "0")
# pick the most recently created subcompartment if any exist
if [ "$SUB_COMPARTMENTS" != "0" ] && [ -n "$SUB_COMPARTMENTS" ]; then
  ROOT_COMPARTMENT=$(oci iam compartment list --query "data[?\"lifecycle-state\"=='ACTIVE'] | sort_by(@, &\"time-created\") | [-1].id" --raw-output 2>/dev/null || echo "$TENANCY")
  if [ -z "$ROOT_COMPARTMENT" ]; then
    ROOT_COMPARTMENT=$TENANCY
  fi
fi
echo "Compartment: $ROOT_COMPARTMENT"

# --- Availability Domain ---
AD=$(oci iam availability-domain list --compartment-id "$ROOT_COMPARTMENT" --query 'data[0].name' --raw-output)
echo "Availability Domain: $AD"

# --- VCN (create if missing) ---
VCN=$(oci network vcn list --compartment-id "$ROOT_COMPARTMENT" --query "data[?\"lifecycle-state\"=='AVAILABLE'] | [0].id" --raw-output 2>/dev/null || true)

if [ -z "$VCN" ]; then
  echo ""
  echo "No VCN found. Creating sentinel-vcn (10.0.0.0/16)..."
  VCN=$(oci network vcn create \
    --compartment-id "$ROOT_COMPARTMENT" \
    --cidr-block "10.0.0.0/16" \
    --display-name "sentinel-vcn" \
    --dns-label "sentinel" \
    --wait-for-state AVAILABLE \
    --query 'data.id' --raw-output)
  # Internet Gateway enabled
  IGW=$(oci network internet-gateway create \
    --compartment-id "$ROOT_COMPARTMENT" \
    --vcn-id "$VCN" \
    --is-enabled true \
    --display-name "sentinel-igw" \
    --wait-for-state AVAILABLE \
    --query 'data.id' --raw-output)
  # Point default route table at IGW
  DEFAULT_RT=$(oci network route-table list --vcn-id "$VCN" --query "data[?\"lifecycle-state\"=='AVAILABLE'] | [0].id" --raw-output)
  oci network route-table update \
    --rt-id "$DEFAULT_RT" \
    --route-rules "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW\"}]" \
    --wait-for-state AVAILABLE \
    --force > /dev/null
  echo "✅ VCN + Internet Gateway created"
else
  echo "Using existing VCN: $VCN"
fi

# --- Subnet (create public if missing) ---
SUBNET=$(oci network subnet list --compartment-id "$ROOT_COMPARTMENT" --vcn-id "$VCN" --query "data[?\"lifecycle-state\"=='AVAILABLE'] | [0].id" --raw-output 2>/dev/null || true)

if [ -z "$SUBNET" ]; then
  echo "No subnet found. Creating public subnet (10.0.0.0/24)..."
  SUBNET=$(oci network subnet create \
    --compartment-id "$ROOT_COMPARTMENT" \
    --vcn-id "$VCN" \
    --cidr-block "10.0.0.0/24" \
    --display-name "sentinel-subnet" \
    --dns-label "sentinel" \
    --prohibit-public-ip-reservation false \
    --wait-for-state AVAILABLE \
    --query 'data.id' --raw-output)
  echo "✅ Subnet created"
else
  echo "Using existing subnet: $SUBNET"
fi

# --- Security List: ensure ports 22/80/443 open (Caddy is the only public entrypoint) ---
SL=$(oci network security-list list --compartment-id "$ROOT_COMPARTMENT" --vcn-id "$VCN" --query "data[0].id" --raw-output 2>/dev/null || true)
sl_update_failed=false
if [ -n "$SL" ]; then
  echo "Updating security list to open 22/80/443..."
  # overhead: existing rules replaced — we re-spec the complete safe set here
  # (default rules + 80/443 in; all egress)
  oci network security-list update \
    --security-list-id "$SL" \
    --ingress-security-rules '[
      {"protocol":"6","source":"0.0.0.0/0","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
      {"protocol":"6","source":"0.0.0.0/0","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":80,"max":80}}},
      {"protocol":"6","source":"0.0.0.0/0","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
      {"protocol":"1","source":"10.0.0.0/16","isStateless":false,"icmpOptions":{"type":3,"code":4}}
    ]' \
    --egress-security-rules '[{"protocol":"all","destination":"0.0.0.0/0","isStateless":false}]' \
    --force \
    --wait-for-state AVAILABLE > /dev/null 2>&1 && echo "✅ Security list updated" || sl_update_failed=true
  if [ "$sl_update_failed" = true ]; then
    echo "⚠️  Security list update failed — manually open 80/443 in the console."
  fi
fi

# --- Image (Ubuntu 22.04 ARM64) ---
IMAGE=$(oci compute image list \
  --compartment-id "$ROOT_COMPARTMENT" \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "22.04" \
  --shape "VM.Standard.A1.Flex" \
  --sort-by TIMECREATED \
  --sort-order DESC \
  --limit 1 \
  --query 'data[0].id' --raw-output)

if [ -z "$IMAGE" ]; then
  echo "ERROR: No Ubuntu 22.04 ARM image found in this region."
  echo "Check available images with: oci compute image list --compartment-id $ROOT_COMPARTMENT --operating-system 'Canonical Ubuntu' --shape VM.Standard.A1.Flex"
  exit 1
fi

echo ""
echo "Image: $IMAGE"
echo "Shape: VM.Standard.A1.Flex ($OCPU OCPU, ${MEM_GB}GB RAM, ${BOOT_GB}GB boot)"
echo "Retry interval: ${INTERVAL}s"
echo ""

# ============================================================================
# Retry loop
# ============================================================================
ATTEMPT=1
while true; do
  echo "[$(date '+%H:%M:%S')] Attempt #$ATTEMPT..."
  
  RESULT=$(oci compute instance launch \
    --availability-domain "$AD" \
    --compartment-id "$ROOT_COMPARTMENT" \
    --display-name "$VM_NAME" \
    --shape "VM.Standard.A1.Flex" \
    --shape-config "{\"ocpus\":$OCPU,\"memoryInGBs\":$MEM_GB}" \
    --source-details "{\"bootVolumeSizeInGBs\":$BOOT_GB,\"imageId\":\"$IMAGE\",\"sourceType\":\"image\"}" \
    --subnet-id "$SUBNET" \
    --assign-public-ip true \
    --ssh-authorized-keys-file "$SSH_PUB_KEY_PATH" \
    2>&1) || true
  
  if echo "$RESULT" | grep -q "OutOfHostCapacity"; then
    echo "  → Out of capacity. Waiting ${INTERVAL}s..."
    sleep "$INTERVAL"
    ATTEMPT=$((ATTEMPT + 1))
  elif echo "$RESULT" | jq -e '.data.id' >/dev/null 2>&1; then
    INSTANCE_ID=$(echo "$RESULT" | jq -r '.data.id')
    echo ""
    echo "============================================"
    echo "✅ INSTANCE CREATED!"
    echo "   OCID: $INSTANCE_ID"
    echo ""
    # wait for VNIC + public IP (usually takes 5-15s)
    echo "   Waiting for public IP..."
    PUBLIC_IP=""
    for i in $(seq 1 12); do
      sleep 5
      PUBLIC_IP=$(oci compute instance list-vnics \
        --instance-id "$INSTANCE_ID" \
        --query 'data[0]."public-ip"' --raw-output 2>/dev/null || true)
      if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "None" ]; then
        break
      fi
    done
    echo "   Public IP: ${PUBLIC_IP:-pending (check console)}"
    echo "   SSH:       ssh -i $KEY_FILE ubuntu@${PUBLIC_IP:-<IP>}"
    echo ""
    echo "   Next: run setup-oracle-vm.sh on this VM"
    echo "============================================"
    exit 0
  else
    echo "$RESULT"
    echo ""
    echo "⚠️  Unexpected error (not capacity). Retrying in ${INTERVAL}s..."
    sleep "$INTERVAL"
    ATTEMPT=$((ATTEMPT + 1))
  fi
done
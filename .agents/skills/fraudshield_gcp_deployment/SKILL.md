---
name: fraudshield_gcp_deployment
description: Instruction manual for starting, stopping, verifying, and deploying the FraudShield application stack on the GCP compute instance VM.
---

# FraudShield GCP Deployment Skill

This skill contains standard procedures for starting, stopping, and hot-redeploying the FraudShield application stack on the Google Cloud Platform (GCP) Compute Engine instance.

## VM Configuration
* **Instance Name**: `fraudshield-demo`
* **Zone**: `us-central1-a`
* **Port Mapping**:
  * Frontend: `3000` (Nginx mapping to static React bundle)
  * Backend API: `8080` (Spring Boot API Gateway)
  * ML microservice: `5001` (Python Isolation Forest FastAPI)

---

## 1. Start the GCP Server VM
To turn on the VM and prepare for deployment:
```powershell
& "C:\Users\newab\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" compute instances start fraudshield-demo --zone=us-central1-a --quiet
```
*Note: Each start allocates a new ephemeral external IP address. Run description checks to find the new IP:*
```powershell
& "C:\Users\newab\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" compute instances list --filter="name=fraudshield-demo"
```

---

## 2. Deploy/Redeploy Codebase on Deployed VM
To fetch latest merged code from your GitHub fork (`origin/main`), clean stale container state leftovers, and rebuild all 8 containers:
```powershell
echo y | & "C:\Users\newab\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" compute ssh fraudshield-demo --zone=us-central1-a --command="cd /home/reboot_murali && sudo git fetch origin && sudo git reset --hard && sudo git checkout main && sudo git pull origin main && sudo docker rm -f \$(sudo docker ps -aq) 2>/dev/null || true && sudo docker compose up -d --build" --quiet
```

### Troubleshooting: Host Key Cache prompt (Plink)
Because Windows uses PuTTY's `plink.exe` for SSH routing, IP changes prompt for host key verification. 
Piping `echo y` ensures the prompt is automatically accepted and the SSH key is cached in the registry (`HKEY_CURRENT_USER\SoftWare\SimonTatham\PuTTY\SshHostKeys`).

---

## 3. Turn Off the GCP Server VM
To stop the VM and pause billing charges:
```powershell
& "C:\Users\newab\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" compute instances stop fraudshield-demo --zone=us-central1-a --quiet
```

"""
Semgrep Runner Service — HTTP API wrapper for Semgrep SAST scans.
Called by n8n workflows. Saves results to shared volume.
"""
import json
import os
import subprocess
import shutil
import uuid
from datetime import datetime, timezone
from flask import Flask, request, jsonify

app = Flask(__name__)
RESULTS_DIR = "/mnt/semgrep/results"


@app.route("/health", methods=["GET"])
def health():
    semgrep_version = ""
    try:
        r = subprocess.run(["semgrep", "--version"], capture_output=True, text=True, timeout=5)
        semgrep_version = r.stdout.strip()
    except Exception:
        semgrep_version = "unavailable"
    return jsonify({"status": "ok", "semgrep": semgrep_version})


@app.route("/scan", methods=["POST"])
def run_scan():
    """
    Expects JSON: { "scanId": "...", "repoUrl": "...", "branch": "main", "token": "..." }
    Runs Semgrep, saves results to /mnt/semgrep/results/{scanId}.json
    Returns: { "scanId": "...", "filePath": "...", "findings": N, "status": "completed" }
    """
    data = request.get_json(silent=True) or {}
    scan_id = data.get("scanId", str(uuid.uuid4()))
    repo_url = data.get("repoUrl", "")
    branch = data.get("branch", "main")
    token = data.get("token")

    if not repo_url:
        return jsonify({"error": "repoUrl is required"}), 400

    workdir = f"/tmp/semgrep-{scan_id}"
    result_file = os.path.join(RESULTS_DIR, f"{scan_id}.json")

    # Clean up previous run
    if os.path.exists(workdir):
        shutil.rmtree(workdir, ignore_errors=True)

    try:
        # Clone repo
        clone_url = repo_url
        if token:
            # Inject token into URL for private repos
            clone_url = repo_url.replace("https://", f"https://oauth2:{token}@")

        clone_cmd = ["git", "clone", "--depth", "1", "--branch", branch, clone_url, workdir]
        print(f"[{scan_id}] Cloning: {' '.join(clone_cmd[:4])} ...")
        result = subprocess.run(clone_cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            print(f"[{scan_id}] Clone failed: {result.stderr[:500]}")
            # Try without branch specification
            clone_cmd = ["git", "clone", "--depth", "1", clone_url, workdir]
            result = subprocess.run(clone_cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0 or not os.path.isdir(workdir):
            return jsonify({
                "scanId": scan_id,
                "status": "failed",
                "error": f"Clone failed: {result.stderr[:300]}"
            }), 500

        # Run Semgrep
        print(f"[{scan_id}] Running Semgrep on {workdir}...")
        semgrep_cmd = [
            "semgrep", "--config=auto", "--json", "--no-git-ignore",
            "-o", result_file, workdir
        ]
        result = subprocess.run(semgrep_cmd, capture_output=True, text=True, timeout=300)

        # Count findings
        findings_count = 0
        if os.path.exists(result_file):
            try:
                with open(result_file) as f:
                    semgrep_data = json.load(f)
                findings_count = len(semgrep_data.get("results", []))
            except Exception:
                pass

        print(f"[{scan_id}] Semgrep completed: {findings_count} findings")

        return jsonify({
            "scanId": scan_id,
            "filePath": result_file,
            "findings": findings_count,
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    except subprocess.TimeoutExpired:
        return jsonify({"scanId": scan_id, "status": "failed", "error": "Scan timeout"}), 500
    except Exception as e:
        print(f"[{scan_id}] Error: {e}")
        return jsonify({"scanId": scan_id, "status": "failed", "error": str(e)}), 500
    finally:
        if os.path.exists(workdir):
            shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    os.makedirs(RESULTS_DIR, exist_ok=True)
    print(f"Semgrep Runner starting on port 5100. Results dir: {RESULTS_DIR}")
    app.run(host="0.0.0.0", port=5100)

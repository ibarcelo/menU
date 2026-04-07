const { execSync, spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const backendDir = path.join(root, "backend");
const uvicorn = path.join(root, "venv", "Scripts", "uvicorn.exe");
const port = "8002";

// Kill anything on the port
try {
  const out = execSync("netstat -ano").toString();
  out.split("\n")
    .filter((l) => l.includes(`:${port}`) && l.includes("LISTENING"))
    .forEach((l) => {
      const pid = l.trim().split(/\s+/).pop();
      if (pid && pid !== "0") {
        try { execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" }); } catch {}
      }
    });
} catch {}

// Start uvicorn
const proc = spawn(uvicorn, ["main:app", "--reload", "--host", "0.0.0.0", "--port", port], {
  cwd: backendDir,
  stdio: "inherit",
  shell: false,
});

proc.on("exit", (code) => process.exit(code ?? 0));
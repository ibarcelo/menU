const { execSync, spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const frontendDir = path.join(root, "frontend");
const port = "3000";

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

// Start Next.js
const proc = spawn("npm", ["run", "dev"], {
  cwd: frontendDir,
  stdio: "inherit",
  shell: true,
});

proc.on("exit", (code) => process.exit(code ?? 0));
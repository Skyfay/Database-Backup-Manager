import { ChildProcess } from "child_process";

/**
 * Wraps a child process in a Promise that resolves on successful exit (code 0)
 * and rejects on error or non-zero exit code.
 * Also handles forwarding stderr to a log function.
 */
export function waitForProcess(
    child: ChildProcess,
    processName: string,
    onLog?: (msg: string) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        let stderrOutput = "";

        if (child.stderr) {
            child.stderr.on('data', (data) => {
                 const str = data.toString();
                 stderrOutput += str;
                 // Keep last 1KB to avoid memory issues with huge logs
                 if (stderrOutput.length > 1024) stderrOutput = stderrOutput.slice(-1024);

                 if (onLog) {
                    onLog(str);
                 }
            });
        }

        child.on('error', (err) => {
            reject(new Error(`Failed to start ${processName}: ${err.message}`));
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                // Attach captured stderr to error message for better visibility
                let errorMsg = `${processName} exited with code ${code}`;
                if (stderrOutput.trim()) {
                    errorMsg += `: ${stderrOutput.trim()}`;
                }
                reject(new Error(errorMsg));
            }
        });
    });
}

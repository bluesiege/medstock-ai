import { useEffect, useRef } from "react";

export default function ForecastChart({ history, predictions, drugName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!history || !predictions) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const W = canvas.width;
    const H = canvas.height;
    const padL = 48, padR = 20, padT = 20, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    const allValues = [...history, ...predictions];
    const maxVal = Math.max(...allValues) * 1.15;
    const totalPoints = history.length + predictions.length;

    function xPos(i) { return padL + (i / (totalPoints - 1)) * chartW; }
    function yPos(v) { return padT + chartH - (v / maxVal) * chartH; }

    // Background
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px Segoe UI";
      ctx.textAlign = "right";
      ctx.fillText(Math.round(maxVal * (1 - i / 4)), padL - 6, y + 4);
    }

    // Today divider
    const divX = xPos(history.length - 1);
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(divX, padT); ctx.lineTo(divX, padT + chartH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("Today", divX, padT + chartH + 16);

    // Actual history area fill
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(history[0]));
    history.forEach((v, i) => { ctx.lineTo(xPos(i), yPos(v)); });
    ctx.lineTo(xPos(history.length - 1), padT + chartH);
    ctx.lineTo(xPos(0), padT + chartH);
    ctx.closePath();
    ctx.fillStyle = "rgba(59,130,246,0.08)";
    ctx.fill();

    // Actual history line
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(history[0]));
    history.forEach((v, i) => { ctx.lineTo(xPos(i), yPos(v)); });
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Forecast area fill
    const fStartX = xPos(history.length - 1);
    ctx.beginPath();
    ctx.moveTo(fStartX, yPos(history[history.length - 1]));
    predictions.forEach((v, i) => { ctx.lineTo(xPos(history.length + i), yPos(v)); });
    ctx.lineTo(xPos(history.length + predictions.length - 1), padT + chartH);
    ctx.lineTo(fStartX, padT + chartH);
    ctx.closePath();
    ctx.fillStyle = "rgba(139,92,246,0.08)";
    ctx.fill();

    // Forecast line
    ctx.beginPath();
    ctx.moveTo(fStartX, yPos(history[history.length - 1]));
    predictions.forEach((v, i) => { ctx.lineTo(xPos(history.length + i), yPos(v)); });
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // X axis labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("30 days ago", padL, padT + chartH + 28);
    ctx.fillText("+30 days", W - padR, padT + chartH + 28);

    // Legend
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(padL, padT - 12, 14, 3);
    ctx.fillStyle = "#374151";
    ctx.font = "11px Segoe UI";
    ctx.textAlign = "left";
    ctx.fillText("Actual (last 30d)", padL + 18, padT - 8);

    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(padL + 130, padT - 12, 14, 3);
    ctx.fillStyle = "#374151";
    ctx.fillText("AI Forecast (next 30d)", padL + 148, padT - 8);

  }, [history, predictions]);

  return (
    <canvas
      ref={canvasRef}
      width={680}
      height={240}
      style={{ width: "100%", height: "240px", borderRadius: "10px", display: "block" }}
    />
  );
}

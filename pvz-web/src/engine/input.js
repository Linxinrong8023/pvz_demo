import { SCENES } from "../game/config.js";

export function bindInput({
  canvas,
  state,
  onCanvasClick,
  onCanvasMove,
  onCanvasLeave,
  onPauseToggle,
}) {
  const toCanvasPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const onClick = (event) => {
    const pos = toCanvasPoint(event);
    onCanvasClick(pos.x, pos.y);
  };

  const onMove = (event) => {
    if (!onCanvasMove) return;
    const pos = toCanvasPoint(event);
    onCanvasMove(pos.x, pos.y);
  };

  const onLeave = () => {
    if (onCanvasLeave) onCanvasLeave();
  };

  const onKeyDown = (event) => {
    if (event.key === " " || event.key === "Escape") {
      if (
        state.scene === SCENES.playing ||
        state.scene === SCENES.paused ||
        state.scene === SCENES.result
      ) {
        event.preventDefault();
        onPauseToggle();
      }
    }
  };

  canvas.addEventListener("click", onClick);
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", onLeave);
  window.addEventListener("keydown", onKeyDown);

  return () => {
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("mousemove", onMove);
    canvas.removeEventListener("mouseleave", onLeave);
    window.removeEventListener("keydown", onKeyDown);
  };
}

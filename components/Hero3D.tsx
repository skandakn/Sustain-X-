"use client";

export default function Hero3D() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <iframe
        src="https://my.spline.design/genkubgreetingrobot-fvK32LIUegsIMkd1Dke75M0Y/"
        style={{ width: "100%", height: "100%", border: "none" }}
        title="3D scene"
      />
      {/* Covers the "Built with Spline" watermark badge in the bottom-right */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "200px",
          height: "56px",
          background: "#f8faf7",
          borderRadius: "12px 0 0 0",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
    </div>
  );
}
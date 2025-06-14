document.addEventListener("DOMContentLoaded", () => {
  const qrTextInput = document.getElementById("qrTextInput");
  const generateQrBtn = document.getElementById("generateQrBtn");
  const downloadQrBtn = document.getElementById("downloadQrBtn");
  const qrcodeDiv = document.getElementById("qrcode");
  const qrMessageDiv = document.getElementById("qrMessage");

  let qrcodeInstance = null;

  generateQrBtn.addEventListener("click", () => {
    const text = qrTextInput.value.trim();
    qrcodeDiv.innerHTML = "";
    qrMessageDiv.innerHTML = "";
    qrMessageDiv.className = "response-message";
    downloadQrBtn.style.display = "none";

    if (text) {
      try {
        qrcodeInstance = new QRCode(qrcodeDiv, {
          text: text,
          width: 256,
          height: 256,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
        });
        qrMessageDiv.classList.add("success-message");
        qrMessageDiv.innerText = "QR generado exitosamente.";
        downloadQrBtn.style.display = "block";
      } catch (e) {
        qrMessageDiv.classList.add("error-message");
        qrMessageDiv.innerText = `Error al generar QR: ${e.message}`;
        console.error("Error generating QR:", e);
      }
    } else {
      qrMessageDiv.classList.add("error-message");
      qrMessageDiv.innerText = "Por favor, introduce texto para generar el QR.";
    }
  });

  downloadQrBtn.addEventListener("click", () => {
    if (qrcodeInstance) {
      const canvas = qrcodeDiv.querySelector("canvas");
      if (canvas) {
        const image = canvas.toDataURL("image/png");

        const a = document.createElement("a");
        a.href = image;
        const fileName =
          qrTextInput.value
            .trim()
            .substring(0, 50)
            .replace(/[^a-zA-Z0-9]/g, "_") || "qrcode";
        a.download = `${fileName}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        qrMessageDiv.classList.add("success-message");
        qrMessageDiv.innerText = "QR descargado exitosamente!";
      } else {
        qrMessageDiv.classList.add("error-message");
        qrMessageDiv.innerText = "No se encontró el QR para descargar.";
      }
    } else {
      qrMessageDiv.classList.add("error-message");
      qrMessageDiv.innerText = "Genera un QR primero para poder descargarlo.";
    }
  });
});

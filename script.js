document.addEventListener("DOMContentLoaded", () => {
  // Main elements
  const qrTypeSelect = document.getElementById("qrType");
  const qrFieldsContainer = document.getElementById("qrFieldsContainer");
  const qrTextInput = document.getElementById("qrTextInput");
  const qrTextGroup = document.getElementById("qrTextGroup");
  const downloadQrBtn = document.getElementById("downloadQrBtn");
  const qrcodeDiv = document.getElementById("qrcode");
  const qrMessageDiv = document.getElementById("qrMessage");
  const colorDarkInput = document.getElementById("colorDark");
  const colorLightInput = document.getElementById("colorLight");
  const qrSizeInput = document.getElementById("qrSize");
  const qrLogoInput = document.getElementById("qrLogoInput");
  const qrLogoPreview = document.getElementById("qrLogoPreview");

  let qrcodeInstance = null;
  let lastQR = { text: "", colorDark: "", colorLight: "", size: 256 };
  let logoImage = null;

  // --- Dynamic QR Type Fields ---
  const qrTypeFields = {
    text: [],
    wifi: [
      { id: "ssid", label: "SSID", type: "text", required: true },
      { id: "password", label: "Contraseña", type: "text", required: false },
      {
        id: "encryption",
        label: "Encriptación",
        type: "select",
        options: ["WPA", "WEP", "nopass"],
        required: true,
      },
      { id: "hidden", label: "Red Oculta", type: "checkbox", required: false },
    ],
    vcard: [
      { id: "name", label: "Nombre", type: "text", required: true },
      { id: "org", label: "Organización", type: "text", required: false },
      { id: "title", label: "Título", type: "text", required: false },
      { id: "tel", label: "Teléfono", type: "text", required: false },
      { id: "email", label: "Email", type: "email", required: false },
      { id: "url", label: "Sitio Web", type: "url", required: false },
      { id: "address", label: "Dirección", type: "text", required: false },
    ],
    email: [
      { id: "to", label: "Para", type: "email", required: true },
      { id: "subject", label: "Asunto", type: "text", required: false },
      { id: "body", label: "Mensaje", type: "textarea", required: false },
    ],
    tel: [{ id: "tel", label: "Teléfono", type: "text", required: true }],
    sms: [
      { id: "tel", label: "Teléfono", type: "text", required: true },
      { id: "body", label: "Mensaje", type: "text", required: false },
    ],
    event: [
      {
        id: "summary",
        label: "Título del Evento",
        type: "text",
        required: true,
      },
      { id: "location", label: "Ubicación", type: "text", required: false },
      {
        id: "description",
        label: "Descripción",
        type: "textarea",
        required: false,
      },
      {
        id: "start",
        label: "Inicio (fecha y hora)",
        type: "datetime-local",
        required: true,
      },
      {
        id: "end",
        label: "Fin (fecha y hora)",
        type: "datetime-local",
        required: true,
      },
    ],
  };

  function renderFields(type) {
    qrFieldsContainer.innerHTML = "";
    if (!qrTypeFields[type] || qrTypeFields[type].length === 0) {
      qrTextGroup.style.display = "block";
      return;
    }
    qrTextGroup.style.display = "none";
    qrTypeFields[type].forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.className = "qr-dyn-field";
      const label = document.createElement("label");
      label.htmlFor = `qrField_${field.id}`;
      label.innerText = field.label + (field.required ? " *" : "");
      let input;
      if (field.type === "select") {
        input = document.createElement("select");
        field.options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt;
          option.innerText = opt;
          input.appendChild(option);
        });
      } else if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = 2;
      } else {
        input = document.createElement("input");
        input.type = field.type;
      }
      input.id = `qrField_${field.id}`;
      input.required = field.required;
      wrapper.appendChild(label);
      wrapper.appendChild(input);
      qrFieldsContainer.appendChild(wrapper);
    });
  }

  function getFieldValues(type) {
    const values = {};
    if (!qrTypeFields[type] || qrTypeFields[type].length === 0) return values;
    qrTypeFields[type].forEach((field) => {
      const el = document.getElementById(`qrField_${field.id}`);
      if (field.type === "checkbox") {
        values[field.id] = el.checked;
      } else {
        values[field.id] = el.value;
      }
    });
    return values;
  }

  function buildQRContent(type) {
    if (type === "text") {
      return qrTextInput.value.trim();
    }
    const vals = getFieldValues(type);
    switch (type) {
      case "wifi":
        // WIFI:T:WPA;S:SSID;P:password;H:true;;
        return `WIFI:T:${vals.encryption || "WPA"};S:${vals.ssid || ""};P:${
          vals.password || ""
        };${vals.hidden ? "H:true;" : ""};`;
      case "vcard":
        return (
          `BEGIN:VCARD\nVERSION:3.0\n` +
          `FN:${vals.name || ""}\n` +
          (vals.org ? `ORG:${vals.org}\n` : "") +
          (vals.title ? `TITLE:${vals.title}\n` : "") +
          (vals.tel ? `TEL:${vals.tel}\n` : "") +
          (vals.email ? `EMAIL:${vals.email}\n` : "") +
          (vals.url ? `URL:${vals.url}\n` : "") +
          (vals.address ? `ADR:${vals.address}\n` : "") +
          `END:VCARD`
        );
      case "email":
        // mailto:to?subject=...&body=...
        let mail = `mailto:${vals.to || ""}`;
        const params = [];
        if (vals.subject)
          params.push(`subject=${encodeURIComponent(vals.subject)}`);
        if (vals.body) params.push(`body=${encodeURIComponent(vals.body)}`);
        if (params.length) mail += `?${params.join("&")}`;
        return mail;
      case "tel":
        return `tel:${vals.tel || ""}`;
      case "sms":
        let sms = `sms:${vals.tel || ""}`;
        if (vals.body) sms += `?body=${encodeURIComponent(vals.body)}`;
        return sms;
      case "event":
        // iCal format
        function formatDate(dt) {
          if (!dt) return "";
          // dt: yyyy-MM-ddTHH:mm
          return dt.replace(/[-:]/g, "").replace("T", "T") + "00Z";
        }
        return (
          `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n` +
          `SUMMARY:${vals.summary || ""}\n` +
          (vals.location ? `LOCATION:${vals.location}\n` : "") +
          (vals.description ? `DESCRIPTION:${vals.description}\n` : "") +
          `DTSTART:${formatDate(vals.start)}\n` +
          `DTEND:${formatDate(vals.end)}\n` +
          `END:VEVENT\nEND:VCALENDAR`
        );
      default:
        return "";
    }
  }

  // --- Logo Upload & Preview ---
  if (qrLogoInput) {
    qrLogoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) {
        qrLogoPreview.style.display = "none";
        logoImage = null;
        generateQR();
        return;
      }
      const reader = new FileReader();
      reader.onload = function (ev) {
        qrLogoPreview.src = ev.target.result;
        qrLogoPreview.style.display = "block";
        logoImage = new window.Image();
        logoImage.onload = function () {
          generateQR();
        };
        logoImage.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function generateQR() {
    const type = qrTypeSelect ? qrTypeSelect.value : "text";
    const text = buildQRContent(type);
    const colorDark = colorDarkInput.value;
    const colorLight = colorLightInput.value;
    const size = parseInt(qrSizeInput.value, 10) || 256;
    qrcodeDiv.innerHTML = "";
    qrMessageDiv.innerHTML = "";
    qrMessageDiv.className = "response-message";
    downloadQrBtn.style.display = "none";

    if (text) {
      try {
        qrcodeInstance = new QRCode(qrcodeDiv, {
          text: text,
          width: size,
          height: size,
          colorDark: colorDark,
          colorLight: colorLight,
          correctLevel: QRCode.CorrectLevel.H,
        });
        // Overlay logo if present and loaded
        const drawLogo = () => {
          const canvas = qrcodeDiv.querySelector("canvas");
          if (
            canvas &&
            logoImage &&
            logoImage.src &&
            logoImage.complete &&
            logoImage.naturalWidth > 0
          ) {
            const ctx = canvas.getContext("2d");
            const logoSize = Math.floor(size * 0.22); // 22% of QR size
            const x = (canvas.width - logoSize) / 2;
            const y = (canvas.height - logoSize) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(
              canvas.width / 2,
              canvas.height / 2,
              logoSize / 2 + 6,
              0,
              2 * Math.PI,
              false
            );
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.restore();
            ctx.drawImage(logoImage, x, y, logoSize, logoSize);
          }
        };
        // Si la imagen ya está cargada, dibujar de inmediato
        if (
          logoImage &&
          logoImage.src &&
          logoImage.complete &&
          logoImage.naturalWidth > 0
        ) {
          drawLogo();
        } else if (logoImage && logoImage.src) {
          // Si no, esperar a que cargue
          logoImage.onload = () => {
            drawLogo();
          };
        }
        qrMessageDiv.classList.add("success-message");
        qrMessageDiv.innerText = "QR generado exitosamente.";
        downloadQrBtn.style.display = "block";
        lastQR = { text, colorDark, colorLight, size };
      } catch (e) {
        qrMessageDiv.classList.add("error-message");
        qrMessageDiv.innerText = `Error al generar QR: ${e.message}`;
        console.error("Error generating QR:", e);
      }
    } else {
      qrMessageDiv.classList.add("error-message");
      qrMessageDiv.innerText =
        "Por favor, introduce información para generar el QR.";
    }
  }

  // --- Dynamic event listeners ---
  if (qrTypeSelect) {
    qrTypeSelect.addEventListener("change", (e) => {
      renderFields(qrTypeSelect.value);
      generateQR();
    });
    renderFields(qrTypeSelect.value);
  }

  // Listen to all dynamic fields
  qrFieldsContainer.addEventListener("input", generateQR);
  qrTextInput.addEventListener("input", generateQR);
  colorDarkInput.addEventListener("input", generateQR);
  colorLightInput.addEventListener("input", generateQR);
  qrSizeInput.addEventListener("input", generateQR);

  // Initial QR
  generateQR();

  downloadQrBtn.addEventListener("click", () => {
    if (qrcodeInstance) {
      const canvas = qrcodeDiv.querySelector("canvas");
      if (canvas) {
        // Redraw logo if present before download
        if (logoImage && logoImage.src) {
          const ctx = canvas.getContext("2d");
          const size = canvas.width;
          const logoSize = Math.floor(size * 0.22);
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, logoSize / 2 + 6, 0, 2 * Math.PI, false);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.restore();
          ctx.drawImage(logoImage, x, y, logoSize, logoSize);
        }
        const image = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = image;
        const fileName =
          lastQR.text
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

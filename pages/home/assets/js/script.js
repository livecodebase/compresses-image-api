$(document).ready(function () {
  const notyf = new Notyf({ duration: 5000 });

  const handle = $("#compression-q-label");
  $("#compression-quantity-slider").slider({
    range: "min",
    value: 80,
    min: 1,
    max: 100,
    create: function () {
      handle.text($(this).slider("value") + "%");
    },
    slide: function (event, ui) {
      handle.text(ui.value + "%");
    },
  });

  const $qualityRadio = $("#QuantityRadio");
  const $maxFileSizeRadio = $("#MaxFileSizeRadio");
  const $compressionQuantitySlider = $(".compression-quantity-slider");
  const $compressionMaxFileSize = $(".compression-maxfilesize");

  $('input[name="compression-radio"]').on("change", function () {
    if ($qualityRadio.is(":checked")) {
      $compressionQuantitySlider.show();
      $compressionMaxFileSize.hide();
    } else if ($maxFileSizeRadio.is(":checked")) {
      $compressionQuantitySlider.hide();
      $compressionMaxFileSize.show();
    }
  });

  $("#dropzone")
    .on("dragover", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(this).addClass("dragging");
    })
    .on("dragleave", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(this).removeClass("dragging");
    })
    .on("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(this).removeClass("dragging");
      const files = e.originalEvent.dataTransfer.files;
      handleFiles(files);
    });

  function isValidFileType(file) {
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    return validTypes.includes(file.type);
  }

  function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileData = {...file }
      fileData.imageBlob = URL.createObjectURL(file)
      fileData.fileType = file.type.split("/")[1].toUpperCase()
      fileData.fileSize = formatBytes(file.size)
      console.log(fileData);
             
    }
    return
    const validFiles = Array.from(files).filter(isValidFileType);
    if (validFiles.length === 0) {
      notyf.error("Only JPEG, JPG, and PNG files are allowed.");
      return;
    }

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        console.log(e);
        
        const li = $(`
        <li class="single-image">
          <div class="s-front">
            <img src="${e.target.result}" alt="">
            <div class="s-front-detail">
              <div class="title">${file.name} <span class="badge">${file.type
          .split("/")[1]
          .toUpperCase()}</span></div>
              <div class="subtitle">Original: ${Math.round(
                file.size / 1024
              )} KB</div>
            </div>
          </div>
          <div class="cta-btn">
            <div class="uk-button-group">
              <button class="uk-button uk-button-primary download">Download</button>
              <div class="uk-inline">
                <button class="uk-button uk-button-default download-options" type="button" aria-label="Toggle Dropdown"><span uk-icon="icon: triangle-down"></span></button>
                <div uk-dropdown="mode: click; target: !.uk-button-group;">
                  <ul class="uk-list">
                    <li><button class="uk-button uk-button-default uk-button-small">JPEG</button></li>
                    <li><button class="uk-button uk-button-default uk-button-small">PNG</button></li>
                    <li><button class="uk-button uk-button-default uk-button-small">WebP</button></li>
                  </ul>
                </div>
              </div>
            </div>
            <button class="uk-icon-button uk-button-default uk-margin-small-right">
              <img src="/assets/compression-settings.svg" alt="">
            </button>
          </div>
        </li>
      `);
        $("#images-list").prepend(li);
      };
      reader.readAsDataURL(file);
    });
  }
  $("#dropzone").on("click", function () {
    const fileInput = $(
      '<input type="file" accept="image/jpeg,image/jpg,image/png" multiple>'
    );
    fileInput.on("change", function (e) {
      const files = e.target.files;
      handleFiles(files);
    });
    fileInput.click();
  });
});

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// TODO: Tip: Always revoke the URL when you're done
// URL.revokeObjectURL(url);
// img.onload = () => {
//   URL.revokeObjectURL(img.src);
// };
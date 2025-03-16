$(document).ready(function () {
  const notyf = new Notyf({ duration: 5000 });
  const uploadedFiles = [];

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

  $("body")
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
    $('.compress-images-list').show();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isValidFileType(file)) {
        notyf.error("Only JPEG, JPG, and PNG files are allowed.");
        continue;
      }
      const fileData = {
        fileType: file.type.split("/")[1]?.toUpperCase() || file.name?.split('.').pop()?.toUpperCase(),
        fileSize: formatFileSize(file.size),
        fileName: truncateString(file.name, 50),
        file,
        id: `file-${uploadedFiles.length}`
      };
      uploadedFiles.unshift(fileData);
      updateList(fileData);
      const formData = new FormData();
      formData.append("file", file);
      $.ajax({
        url: "/api/compress/image",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
          $(`#${fileData.id} .download`).removeClass('disabled');
          $(`#${fileData.id} .download`).attr('href', response.minified);
          $(`#${fileData.id} img`).attr('src', response.minified);
          $(`#${fileData.id}`).removeClass('inprogress');
          $(`#${fileData.id} .compressed-size`).text(`${response.minifiedSize} ( -${response.compressionRatio} )`);
          const targetIndex = uploadedFiles.findIndex(file => file.id === fileData.id)
          if (targetIndex !== -1) {
            uploadedFiles[targetIndex].response = {...response}
          }
        },
        error: function (jqXHR, textStatus, errorThrown) {
          notyf.error("Technical issue. Please try again later.");
          console.error("Error: ", textStatus, errorThrown);
        }
      });
    }
  }

  $("#dropzone").on("click", function () {
    const fileInput = $('<input type="file" accept="image/jpeg,image/jpg,image/png" multiple>');
    fileInput.on("change", function (e) {
      const files = e.target.files;
      handleFiles(files);
    });
    fileInput.click();
  });
});

function formatFileSize(bytes, decimalPoint) {
  if (bytes == 0) return "0 Bytes";
  const k = 1000,
    dm = decimalPoint || 2,
    sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function updateList(file) {
  const li = $(`
    <li id="${file.id}" class="single-image inprogress">
      <div class="s-front">
        <img src="" alt="">
        <div class="loading-img"><div uk-spinner></div></div>
        <div class="s-front-detail">
          <div class="title">${file.fileName}</div>
          <div class="subtitle">
            <span class="badge -${file.fileType?.toLowerCase()}">${file.fileType}</span>
            <span class="original-size">Original: ${file.fileSize}  <span class="compression-matrix">|  Compressed: <span class="compressed-size"></span></span></span>
          </div>
        </div>
      </div>
      <div class="cta-btn">
        <div class="uk-button-group">
          <a href="" download="${file.file.name}" class="uk-button uk-button-primary download disabled">
            <span class="btn-label">Download</span>
            <span uk-spinner></span>
          </a>
        </div>
      </div>
    </li>
  `);
  // <div class="progress" style="width: 0%;"></div>
  $("#images-list").prepend(li);
}

function truncateString(str, num) {
  if (str.length > num) {
    return str.slice(0, num) + "...";
  } else {
    return str;
  }
}
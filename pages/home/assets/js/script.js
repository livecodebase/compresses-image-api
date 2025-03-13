$(document).ready(function () {
  const handle = $( "#compression-q-label" );
  $("#compression-quantity-slider").slider({
    range: "min",
    value: 80,
    min: 1,
    max: 100,
    create: function () {
      handle.text($(this).slider("value") + '%');
    },
    slide: function (event, ui) {
      handle.text(ui.value + '%');
    },
  });

  const $qualityRadio = $('#QuantityRadio');
  const $maxFileSizeRadio = $('#MaxFileSizeRadio');
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

});

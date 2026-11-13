/* eslint-disable @typescript-eslint/no-unused-vars -- handlePrint se invoca desde el HTML del fixture. */
function checkOverflow() {
  var el = document.getElementById("document-preview-a4");
  var warn = document.getElementById("overflow-warning");
  if (el.scrollHeight > el.clientHeight + 2) {
    warn.style.display = "block";
    return true;
  }
  warn.style.display = "none";
  return false;
}

function handlePrint() {
  if (checkOverflow()) return;
  var el = document.getElementById("document-preview-a4");
  var styles = document.querySelectorAll("style");
  var styleHtml = "";
  styles.forEach(function (s) {
    styleHtml += s.outerHTML;
  });
  var html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Imprimir</title>' +
    styleHtml +
    "<style>@page{size:216mm 279mm;margin:0}html,body{margin:0;padding:0;width:216mm;background:white}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>" +
    el.outerHTML +
    "</body></html>";
  var blob = new Blob([html], { type: "text/html;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var win = window.open(url, "_blank");
  if (win) {
    var timer = setInterval(function () {
      try {
        if (win.document.readyState === "complete") {
          clearInterval(timer);
          win.print();
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        clearInterval(timer);
        URL.revokeObjectURL(url);
      }
    }, 100);
    setTimeout(function () {
      clearInterval(timer);
      URL.revokeObjectURL(url);
    }, 10000);
  }
}

checkOverflow();

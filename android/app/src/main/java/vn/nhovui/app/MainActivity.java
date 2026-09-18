package vn.nhovui.app;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import java.io.OutputStream;

/**
 * Vỏ ứng dụng cho trang Nhớ Vui.
 *
 * Điểm mấu chốt: KHÔNG nạp trang bằng file:///android_asset/. Với gốc file://
 * thì Chromium coi là kết nối không an toàn, navigator.mediaDevices không tồn tại
 * và micro vĩnh viễn không dùng được — đúng lỗi gặp phải khi mở file HTML rời
 * trên điện thoại.
 *
 * Thay vào đó dùng WebViewAssetLoader để phục vụ chính những file đó qua
 * https://appassets.androidplatform.net/ — một gốc https hợp lệ, nên trang chạy
 * trong ngữ cảnh an toàn và getUserMedia hoạt động bình thường.
 */
public class MainActivity extends Activity {

    private static final String DOMAIN = "appassets.androidplatform.net";
    private static final String TRANG_CHU = "https://" + DOMAIN + "/assets/index.html";
    private static final int REQ_MIC = 1001;
    private static final int REQ_CHON_TEP = 1002;

    private WebView web;
    private PermissionRequest yeuCauDangCho;
    private ValueCallback<Uri[]> traTepVe;

    @Override
    protected void onCreate(@Nullable Bundle state) {
        super.onCreate(state);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                    // localStorage + IndexedDB
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);                     // không cần, và an toàn hơn
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);

        final WebViewAssetLoader nap = new WebViewAssetLoader.Builder()
                .setDomain(DOMAIN)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(@NonNull WebView v,
                                                              @NonNull WebResourceRequest r) {
                return nap.shouldInterceptRequest(r.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(@NonNull WebView v,
                                                    @NonNull WebResourceRequest r) {
                Uri u = r.getUrl();
                if (DOMAIN.equals(u.getHost())) return false;   // trang của mình: cứ nạp
                try {                                            // link ngoài: mở trình duyệt
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) { }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {

            /** WebView hỏi xin micro thay cho trang web. */
            @Override
            public void onPermissionRequest(final PermissionRequest yeuCau) {
                runOnUiThread(() -> {
                    boolean canMic = false;
                    for (String tai : yeuCau.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(tai)) canMic = true;
                    }
                    if (!canMic) { yeuCau.deny(); return; }

                    if (coQuyenMic()) {
                        yeuCau.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        yeuCauDangCho = yeuCau;      // hỏi người dùng rồi trả lời sau
                        xinQuyenMic();
                    }
                });
            }

            /** Cho nút "Ghi bằng ứng dụng của máy" mở được ứng dụng ghi âm. */
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> traVe,
                                             FileChooserParams thamSo) {
                if (traTepVe != null) traTepVe.onReceiveValue(null);
                traTepVe = traVe;
                try {
                    startActivityForResult(thamSo.createIntent(), REQ_CHON_TEP);
                    return true;
                } catch (Exception e) {
                    traTepVe = null;
                    return false;
                }
            }
        });

        web.addJavascriptInterface(new CauNoi(), "NhoVuiAndroid");
        web.loadUrl(TRANG_CHU);
    }

    private boolean coQuyenMic() {
        return checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void xinQuyenMic() {
        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
    }

    @Override
    public void onRequestPermissionsResult(int ma, @NonNull String[] quyen, @NonNull int[] ketQua) {
        super.onRequestPermissionsResult(ma, quyen, ketQua);
        if (ma != REQ_MIC || yeuCauDangCho == null) return;
        boolean dongY = ketQua.length > 0 && ketQua[0] == PackageManager.PERMISSION_GRANTED;
        if (dongY) {
            yeuCauDangCho.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            yeuCauDangCho.deny();
        }
        yeuCauDangCho = null;
    }

    @Override
    protected void onActivityResult(int ma, int ketQua, @Nullable Intent dl) {
        if (ma == REQ_CHON_TEP) {
            if (traTepVe != null) {
                traTepVe.onReceiveValue(
                        FileChooserParamsCompat.parse(this, ketQua, dl));
                traTepVe = null;
            }
            return;
        }
        super.onActivityResult(ma, ketQua, dl);
    }

    /** Gom kết quả chọn tệp về mảng Uri, kể cả khi chọn nhiều tệp. */
    static final class FileChooserParamsCompat {
        static Uri[] parse(Activity a, int ketQua, Intent dl) {
            if (ketQua != Activity.RESULT_OK || dl == null) return null;
            return WebChromeClient.FileChooserParams.parseResult(ketQua, dl);
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    /**
     * Cầu nối để trang web lưu bản ghi âm ra thư mục Tải về của máy.
     * Trang gọi: window.NhoVuiAndroid.luuTep(base64, tenFile, kieu)
     */
    private final class CauNoi {
        @JavascriptInterface
        public boolean luuTep(String base64, String ten, String kieu) {
            try {
                byte[] du = Base64.decode(base64, Base64.DEFAULT);
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, ten);
                cv.put(MediaStore.Downloads.MIME_TYPE, kieu);
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                cv.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri noi = getContentResolver().insert(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (noi == null) return false;

                try (OutputStream ra = getContentResolver().openOutputStream(noi)) {
                    if (ra == null) return false;
                    ra.write(du);
                }
                cv.clear();
                cv.put(MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(noi, cv, null, null);

                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "Đã lưu " + ten + " vào thư mục Tải về", Toast.LENGTH_LONG).show());
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public String phienBan() {
            return Build.VERSION.RELEASE;
        }
    }
}

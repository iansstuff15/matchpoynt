fn main() {
    // Declaring app commands makes them deny-by-default: each must be granted
    // in capabilities/ through its generated `allow-<command>` permission.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["app_info"])),
    )
    .expect("failed to run tauri-build");
}

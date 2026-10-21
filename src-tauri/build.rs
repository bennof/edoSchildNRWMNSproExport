fn main() {
    println!("cargo:rerun-if-env-changed=SVWS_VERIFY_TLS");
    let verify = std::env::var("SVWS_VERIFY_TLS").unwrap_or_else(|_| "false".into());
    println!("cargo:rustc-env=SVWS_VERIFY_TLS={verify}");
    tauri_build::build()
}

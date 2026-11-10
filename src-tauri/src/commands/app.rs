use serde::Serialize;
use tauri::AppHandle;

/// Identity of the running desktop build, as shown in the app shell.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub os: String,
}

fn build_app_info(name: &str, version: &str, os: &str) -> AppInfo {
    AppInfo {
        name: name.to_owned(),
        version: version.to_owned(),
        os: os.to_owned(),
    }
}

/// Returns the product name and version from `tauri.conf.json`, which reads
/// its version from `package.json`.
#[tauri::command]
pub fn app_info(app: AppHandle) -> AppInfo {
    let package = app.package_info();
    build_app_info(
        &package.name,
        &package.version.to_string(),
        std::env::consts::OS,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_app_info_from_parts() {
        let info = build_app_info("Matchpoynt", "0.1.0", "macos");
        assert_eq!(
            info,
            AppInfo {
                name: "Matchpoynt".into(),
                version: "0.1.0".into(),
                os: "macos".into(),
            }
        );
    }

    #[test]
    fn serializes_with_camel_case_keys() {
        let json = serde_json::to_value(build_app_info("Matchpoynt", "1.2.3", "linux")).unwrap();
        assert_eq!(json["name"], "Matchpoynt");
        assert_eq!(json["version"], "1.2.3");
        assert_eq!(json["os"], "linux");
    }
}

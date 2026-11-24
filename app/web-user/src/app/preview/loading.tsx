import styles from "@/features/preview/PreviewStudio.module.css";

export default function PreviewLoading() {
  return (
    <div className={styles.studioPage}>
      <div className={styles.studioGrid}>
        <div className={styles.stageColumn}>
          <div className={styles.stageLoading} aria-busy="true">
            <div className={styles.stageSpinner} aria-hidden="true" />
            <p>Đang tải Studio Preview 3D...</p>
          </div>
        </div>
        <aside className={styles.panelColumn} aria-busy="true">
          <div className={styles.panelHeader}>
            <span className={styles.eyebrow}>STUDIO PREVIEW 3D</span>
            <h1 className={styles.panelTitle}>Thử ảnh trên bản in thật</h1>
          </div>
          <div className={styles.panelBody}>
            <p className={styles.sectionDescription}>
              Đang chuẩn bị danh sách mẫu Photobooth...
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export async function openCvInNewTab(getDownload: () => Promise<{ url: string }>): Promise<void> {
  const downloadTab = window.open('about:blank', '_blank')
  if (!downloadTab) {
    throw new Error('El navegador bloqueó la pestaña de descarga. Permití las ventanas emergentes e intentá nuevamente.')
  }
  try {
    // Keep the handle for navigation after the request without exposing the original tab.
    downloadTab.opener = null
    const { url } = await getDownload()
    if (downloadTab.closed) {
      throw new Error('La pestaña de descarga se cerró. Intentá descargar el CV nuevamente.')
    }
    downloadTab.location.replace(url)
  } catch (cause) {
    downloadTab.close()
    throw cause
  }
}

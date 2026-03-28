export const handleShare = async (title: string, text: string) => {
  const url = window.location.origin;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      console.warn("分享被取消或失败", err);
    }
  } else {
    try {
      await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
      alert("文案及链接已复制到剪贴板");
    } catch (err) {
      console.error("复制失败", err);
    }
  }
};

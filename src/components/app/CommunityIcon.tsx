/**
 * Renders a community icon, which may be an uploaded image URL or an emoji.
 * Pass box styling (size/rounding/bg) via `className` and emoji size via `emojiClass`.
 */
export default function CommunityIcon({
  icon,
  className = "",
  emojiClass = "text-base",
}: {
  icon?: string | null;
  className?: string;
  emojiClass?: string;
}) {
  const isUrl = !!icon && /^https?:\/\//.test(icon);
  return (
    <span className={"flex items-center justify-center overflow-hidden " + className}>
      {isUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon!} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={emojiClass}>{icon ?? "🛡"}</span>
      )}
    </span>
  );
}

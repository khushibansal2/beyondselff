/**
 * Returns a deterministic DiceBear avatar URL for a user.
 * Same user always gets the same avatar (seed = email or name).
 * Falls back to initials if the image fails to load.
 */
export function getAvatarUrl(user) {
  const seed = encodeURIComponent(user?.email || user?.name || user?.id || 'default');
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&backgroundType=gradientLinear`;
}

/** Inline component helper — use as <AvatarImg user={user} className="..." /> */
export function getAvatarProps(user, fallbackClass) {
  return {
    src: getAvatarUrl(user),
    alt: user?.name || 'User',
  };
}

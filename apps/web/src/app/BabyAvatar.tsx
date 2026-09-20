import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from './api';
import { photoKeys } from './photo-query';
import styles from './BabyAvatar.module.css';

export function BabyAvatar({
  familyId,
  babyId,
  nickname,
  photoId,
}: {
  familyId: string;
  babyId: string;
  nickname: string;
  photoId: string | null;
}): React.JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string>();
  const preview = useQuery({
    queryKey: photoKeys.preview(familyId, babyId, photoId ?? '', 'THUMBNAIL'),
    queryFn: () => api.getPhotoPreview(familyId, babyId, photoId!, 'THUMBNAIL'),
    enabled: Boolean(familyId && babyId && photoId),
    staleTime: 4 * 60_000,
    refetchInterval: 4 * 60_000,
  });
  const url = preview.data?.url;
  return url && url !== failedUrl ? (
    <img
      className={styles.image}
      src={url}
      alt=""
      onError={() => {
        setFailedUrl(url);
        void preview.refetch();
      }}
    />
  ) : (
    <>{nickname.slice(0, 1)}</>
  );
}

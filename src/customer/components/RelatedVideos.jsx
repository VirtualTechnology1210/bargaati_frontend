import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../util';

const RelatedVideos = ({ videoId, limit = 8, onSelect }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!videoId) return;
      try {
        setLoading(true);
        const res = await axios.get(`${BASE_URL}/videos/public/${videoId}/related`, { params: { limit } });
        if (res.data?.success) setVideos(res.data.data || []);
        else setVideos([]);
      } catch (e) {
        console.error('Failed to fetch related videos', e);
        setError('Failed to load related videos');
      } finally {
        setLoading(false);
      }
    };
    fetchRelated();
  }, [videoId, limit]);

  const getThumb = (video) => {
    if (video.thumbnailUrl) return video.thumbnailUrl.startsWith('/uploads/') ? `${BASE_URL}${video.thumbnailUrl}` : video.thumbnailUrl;
    if (video.videoUrl?.includes('youtube.com') || video.videoUrl?.includes('youtu.be')) {
      let id = '';
      if (video.videoUrl.includes('youtube.com/watch?v=')) id = video.videoUrl.split('v=')[1].split('&')[0];
      else if (video.videoUrl.includes('youtu.be/')) id = video.videoUrl.split('youtu.be/')[1].split('?')[0];
      if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    }
    return `https://via.placeholder.com/300x200/111827/ffffff?text=${encodeURIComponent(video.title || 'Video')}`;
  };

  if (loading) return <div className="mt-6 text-sm text-gray-400">Loading related videos...</div>;
  if (error || videos.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-white mb-3">Related videos</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {videos.map(v => (
          <button key={v.id} className="text-left group" onClick={() => onSelect?.(v)}>
            <div className="aspect-video bg-gray-800 rounded overflow-hidden">
              <img src={getThumb(v)} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <p className="mt-2 text-sm text-gray-200 line-clamp-2">{v.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelatedVideos;
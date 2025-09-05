import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function CollectionView() {
  const { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    // Redirect to /products with category query param set to collection slug
    const params = new URLSearchParams();
    if (slug) params.set('category', slug);
    navigate({ pathname: '/products', search: params.toString() }, { replace: true });
  }, [slug, navigate]);

  return null;
}

import { useState, useEffect } from 'react';

export function useFavorites() {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('favorite_routes');
        if (saved) {
            try {
                setFavorites(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse favorites', e);
                setFavorites([]);
            }
        }
        setIsLoaded(true);
    }, []);

    const toggleFavorite = (routeId: string) => {
        setFavorites(prev => {
            const newFavorites = prev.includes(routeId)
                ? prev.filter(id => id !== routeId)
                : [...prev, routeId];

            localStorage.setItem('favorite_routes', JSON.stringify(newFavorites));
            return newFavorites;
        });
    };

    const isFavorite = (routeId: string) => {
        return favorites.includes(routeId);
    };

    return {
        favorites,
        toggleFavorite,
        isFavorite,
        isLoaded
    };
}

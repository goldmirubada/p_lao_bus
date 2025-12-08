export const ROUTE_FARES: { [key: string]: number } = {
    // Default fare
    'default': 5000,

    // Specific routes (Route ID or Number -> Price)
    // These are mock values for demonstration
    'CBS-1': 5000,
    'CBS-2': 5000,
    'CBS-3': 7000, // Longer route
    'CBS-4': 5000,
    'CBS-5': 5000,
    'CBS-6': 9000, // Border route
    'CBS-8': 5000,
    'CBS-9': 5000,
    'CBS-10': 5000,
    'CBS-11': 6000,
    'CBS-12': 5000,
    'CBS-14': 8000, // Friendship bridge
    'CBS-20': 5000,
    'CBS-23': 5000,
    'CBS-28': 5000,
    'CBS-29': 15000, // Dong Dok Univ (Example of premium/long distance)
    'CBS-30': 5000,
    'CBS-31': 5000,
    'CBS-32': 5000,
    'CBS-33': 5000,
    'CBS-49': 5000,
};

export const formatFare = (price: number, currency: string = 'KIP') => {
    return `${price.toLocaleString()} ${currency}`;
};

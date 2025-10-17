/**
 * Image Optimization Utilities
 *
 * Provides utilities for lazy loading images, WebP conversion,
 * responsive images, and CDN integration with Firebase Storage
 */

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    // Was able or not to get WebP representation
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
}

/**
 * Get optimized image URL with format and size parameters
 */
export function getOptimizedImageUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }
): string {
  if (!url) return '';

  // If it's a Firebase Storage URL, add transformation parameters
  if (url.includes('firebasestorage.googleapis.com')) {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    // Add size parameters
    if (options?.width) params.set('w', options.width.toString());
    if (options?.height) params.set('h', options.height.toString());
    if (options?.quality) params.set('q', options.quality.toString());

    // Use WebP if supported
    if (supportsWebP() && !options?.format) {
      params.set('fm', 'webp');
    } else if (options?.format) {
      params.set('fm', options.format);
    }

    urlObj.search = params.toString();
    return urlObj.toString();
  }

  return url;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  url: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths
    .map((width) => {
      const optimizedUrl = getOptimizedImageUrl(url, { width });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Lazy load image with Intersection Observer
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  options?: IntersectionObserverInit
): void {
  if (!('IntersectionObserver' in window)) {
    // Fallback: load immediately if Intersection Observer not supported
    if (img.dataset.src) {
      img.src = img.dataset.src;
    }
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
    }
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const image = entry.target as HTMLImageElement;

        // Load the image
        if (image.dataset.src) {
          image.src = image.dataset.src;
        }
        if (image.dataset.srcset) {
          image.srcset = image.dataset.srcset;
        }

        // Add loaded class for fade-in effect
        image.classList.add('loaded');

        // Stop observing
        observer.unobserve(image);
      }
    });
  }, options);

  observer.observe(img);
}

/**
 * Preload critical images
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(urls.map(preloadImage));
}

/**
 * Get image dimensions without loading full image
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Create blur placeholder for progressive image loading
 */
export function createBlurPlaceholder(
  width: number,
  height: number,
  color: string = '#e5e7eb'
): string {
  // Create a tiny 1x1 SVG with the blur effect
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="20"/>
      </filter>
      <rect width="${width}" height="${height}" fill="${color}" filter="url(#b)"/>
    </svg>
  `;

  // Encode to base64
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Detect if image should use lazy loading based on position
 */
export function shouldLazyLoad(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  // Don't lazy load if image is in viewport or just below (for immediate scroll)
  return rect.top > viewportHeight * 1.5;
}

/**
 * Image loading strategies
 */
export const ImageLoadingStrategy = {
  /**
   * Eager: Load immediately (for above-the-fold images)
   */
  EAGER: 'eager',

  /**
   * Lazy: Load when near viewport (default for below-the-fold images)
   */
  LAZY: 'lazy',

  /**
   * Preload: Load in background (for critical images)
   */
  PRELOAD: 'preload',
} as const;

/**
 * Image formats by use case
 */
export const ImageFormat = {
  /**
   * WebP: Best compression, wide support
   */
  WEBP: 'webp',

  /**
   * JPEG: For photos, universal support
   */
  JPEG: 'jpg',

  /**
   * PNG: For images with transparency
   */
  PNG: 'png',

  /**
   * AVIF: Next-gen format, best compression (limited support)
   */
  AVIF: 'avif',
} as const;

/**
 * Responsive image breakpoints
 */
export const ResponsiveBreakpoints = {
  MOBILE: 320,
  TABLET: 640,
  LAPTOP: 960,
  DESKTOP: 1280,
  WIDE: 1920,
} as const;

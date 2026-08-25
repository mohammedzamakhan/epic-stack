declare module 'emdash' {
  export interface EmDashCollections {
    posts: {
        id: string;
        title: string;
        heroImage?: { url: string; alt?: string; sizes?: any };
        content: any;
        relatedPosts?: any[] | null;
        categories?: { title: string }[] | null;
        meta?: {
            title?: string | null;
            image?: { url: string; alt?: string };
            description?: string | null;
        };
        publishedAt?: string | null;
        authors?: any[] | null;
        populatedAuthors?: any[] | null;
        slug?: string | null;
        slugLock?: boolean | null;
        updatedAt: string;
        createdAt: string;
        _status?: ('draft' | 'published') | null;
    };
    pages: {
        id: string;
        title: string;
        hero?: any;
        layout?: any[];
        meta?: {
            title?: string | null;
            image?: { url: string; alt?: string };
            description?: string | null;
        };
        slug?: string | null;
        slugLock?: boolean | null;
        updatedAt: string;
        createdAt: string;
        _status?: ('draft' | 'published') | null;
    };
  }

  export function getEmDashCollection(type: 'posts', options?: any): Promise<{ entries: { id: string, data: EmDashCollections['posts'] }[], hasMore?: boolean, nextCursor?: string }>;
  export function getEmDashCollection(type: 'pages', options?: any): Promise<{ entries: { id: string, data: EmDashCollections['pages'] }[], hasMore?: boolean, nextCursor?: string }>;

  export function getEmDashEntry(type: 'posts', id: string, options?: any): Promise<{ entry: { id: string, data: EmDashCollections['posts'] } | null }>;
  export function getEmDashEntry(type: 'pages', id: string, options?: any): Promise<{ entry: { id: string, data: EmDashCollections['pages'] } | null }>;

  export function getMenu(name: string, options?: any): Promise<any>;
  export function getSiteSettings(): Promise<any>;
}

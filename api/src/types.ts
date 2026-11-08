/** Museum-agnostic artwork record (maps to the `Artwork` model). */
export interface Artwork {
  /** Globally unique: `${source}:${sourceId}` */
  id: string;
  source: MuseumSource;
  sourceId: string;
  title: string;
  artist: string;
  /** Highest-resolution original image URL available. */
  originalImageUrl: string;
  /** Small preview URL for lists. */
  thumbnailUrl?: string;
  /** Pixel size of the original when the API reports it. */
  width?: number;
  height?: number;
  /** Creation date as displayed by the museum (free text, e.g. "c. 1890"). */
  year?: string;
  creditLine?: string;
  sourceMuseum: string;
  license: "CC0" | "Public Domain";
  /** Only artworks with this true are ever ingested/exposed. */
  isPublicDomain: boolean;
  sourceUrl: string;
}

/** Museums with a search client (used by `ingest`, `smoke`). */
export type ClientSource = "met" | "cleveland" | "aic";
/** Every museum we store; smk/nga are ingested in bulk only (see ingest-all.ts). */
export type MuseumSource = ClientSource | "smk" | "nga";

export interface SearchOptions {
  query: string;
  /** 1-based page. */
  page?: number;
  /** Results per page (max 50). */
  limit?: number;
}

export interface MuseumClient {
  readonly source: ClientSource;
  search(opts: SearchOptions): Promise<Artwork[]>;
}

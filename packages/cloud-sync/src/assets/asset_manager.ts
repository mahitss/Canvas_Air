import { IAssetManager } from "../interfaces";
import { AssetRecord } from "../domain";
import { AssetException } from "../errors";

export class AssetManager implements IAssetManager {
  private readonly assets = new Map<string, AssetRecord>();

  /**
   * Synchronizes dynamic canvas resources (custom brushes, template fonts, AI layers) on the cloud.
   */
  public async syncAsset(asset: AssetRecord): Promise<void> {
    if (!asset || !asset.assetId) {
      throw new AssetException("Asset metadata cannot be empty");
    }

    if (asset.sizeBytes <= 0) {
      throw new AssetException("Asset size must be greater than zero");
    }

    this.assets.set(asset.assetId, { ...asset });
  }

  public async getAssetPath(assetId: string): Promise<string> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new AssetException(`Asset ID not found: ${assetId}`);
    }
    return asset.uri;
  }

  public async deleteAsset(assetId: string): Promise<void> {
    this.assets.delete(assetId);
  }

  public getAsset(assetId: string): AssetRecord | null {
    return this.assets.get(assetId) || null;
  }
}

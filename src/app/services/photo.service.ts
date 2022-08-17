import { Injectable } from '@angular/core';

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';


@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  public photos: UserPhoto[] = [];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private PHOTO_STORAGE = 'photos';
  private platform: Platform;


  constructor(platform: Platform) {
    this.platform = platform;
  }


  /**
   * loadSaved
   */
  public async loadSaved() {
    const photoList = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = JSON.parse(photoList.value) || [];
    //reads all saved photo from the FileSystem
    if (!this.platform.is('hybrid')) {
      for (const photo of this.photos) {
        const readFile = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data,
        });


        //load the photo as base64 [FOR WEB ONLY]
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;

      }
    }

  }


  /**
   * addNewToGallery
   */
  public async addNewToGallery() {
    const capturePhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
      // saveToGallery: true,
    });

    const savedImageFile = await this.savePicture(capturePhoto);
    this.photos.unshift(
      savedImageFile,
    );
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }


  /**
   * savePicture
   */
  private async savePicture(photo: Photo) {
    const base64Data = await this.readAsBase64(photo);
    // Write the file to the data directory
    const fileName = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    if (this.platform.is('hybrid')) {
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri)
      };
    }

    else {
      return {

        filepath: fileName,
        webviewPath: photo.base64String
      };

    }
    // Use webPath to display the new image instead of base64 since it's
    // already loaded into memory
  }


  private async readAsBase64(photo: Photo) {
    if (this.platform.is('hybrid')) {
      const file = await Filesystem.readFile({ path: photo.path });
      return file.data;
    } else {
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }

  }

  private convertBlobToBase64 = (blob: Blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
        ;
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);

    });

}


export interface UserPhoto {
  // filename: string;
  filepath: string;
  webviewPath: string;
}


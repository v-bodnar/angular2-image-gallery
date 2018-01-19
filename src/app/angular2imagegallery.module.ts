import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpModule} from '@angular/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ImageService} from './services/image.service';
import {GalleryComponent} from './gallery/gallery.component';
import {ViewerComponent} from './viewer/viewer.component';
import {DemoComponent} from './demo/demo.component';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';


@NgModule({
    declarations: [
        GalleryComponent,
        ViewerComponent,
        DemoComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        HttpModule,
        HttpClientModule,
        BrowserAnimationsModule
    ],
    providers: [
        ImageService
    ],
    bootstrap: [
        DemoComponent
    ],
    exports: [
        GalleryComponent,
        ViewerComponent
    ]
})
export class Angular2ImageGalleryModule {
}

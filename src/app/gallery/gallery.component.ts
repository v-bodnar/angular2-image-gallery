import {
    ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, QueryList,
    SimpleChanges, ViewChild, ViewChildren
} from '@angular/core'
import {ImageService} from '../services/image.service'
import {Subscription} from 'rxjs/Subscription'
import 'rxjs/add/operator/map'
import {HttpClient} from '@angular/common/http';

declare var jquery:any;
declare var $ :any;

@Component({
    selector: 'gallery',
    templateUrl: './gallery.component.html',
    styleUrls: ['./gallery.component.css']
})
export class GalleryComponent implements OnInit, OnDestroy, OnChanges {
    @Input('flexBorderSize') providedImageMargin: number = 3
    @Input('flexImageSize') providedImageSize: number = 7
    @Input('galleryName') providedGalleryName: string = ''
    @Input('metadataUri') providedMetadataUri: string = undefined

    @Output() viewerChange = new EventEmitter<boolean>()

    @ViewChild('galleryContainer') galleryContainer: ElementRef
    @ViewChildren('imageElement') imageElements: QueryList<any>

    @HostListener('window:scroll', ['$event']) triggerCycle(event: any) {
        this.scaleGallery()
    }

    @HostListener('window:resize', ['$event']) windowResize(event: any) {
        this.render()
    }

    public gallery: any[] = []
    public imageDataStaticPath: string = 'assets/img/gallery/'
    public imageDataCompletePath: string = ''
    public dataFileName: string = 'data.json'
    public images: any[] = []
    public minimalQualityCategory = 'preview_xxs'
    public viewerSubscription: Subscription

    constructor(public ImageService: ImageService, public http: HttpClient, public ChangeDetectorRef: ChangeDetectorRef) {
    }

    public ngOnInit() {
        this.fetchDataAndRender()
        this.viewerSubscription = this.ImageService.showImageViewerChanged$
            .subscribe((visibility: boolean) => this.viewerChange.emit(visibility));

    }

    public ngOnChanges(changes: SimpleChanges) {
        // input params changed
        if (changes["providedGalleryName"] != null)
            this.fetchDataAndRender()
        else
            this.render()
    }

    public ngOnDestroy() {
        if (this.viewerSubscription) {
            this.viewerSubscription.unsubscribe()
        }
    }

    public openImageViewer(img: any) {
        this.ImageService.updateImages(this.images)
        this.ImageService.updateSelectedImageIndex(this.images.indexOf(img))
        this.ImageService.showImageViewer(true)
    }

    private fetchDataAndRender() {
        this.imageDataCompletePath = this.providedMetadataUri

        if (!this.providedMetadataUri) {
            this.imageDataCompletePath = this.providedGalleryName != '' ?
                this.imageDataStaticPath + this.providedGalleryName + '/' + this.dataFileName :
                this.imageDataStaticPath + this.dataFileName
        }

        this.http.get(this.imageDataCompletePath)
            .subscribe(
                data => {
                    this.images = (<any>data)
                    this.ImageService.updateImages(this.images)

                    this.images.forEach((image) => {
                        image['galleryImageLoaded'] = false
                        image['viewerImageLoaded'] = false
                        image['srcAfterFocus'] = ''
                    })
                    // twice, single leads to different strange browser behaviour
                    this.render()
                    this.render()
                    $('[data-toggle="popover"]').popover()
                },
                err => {
                    this.providedMetadataUri ?
                        console.error("Provided endpoint '" + this.providedMetadataUri + "' did not serve metadata correctly or in the expected format. \n\nSee here for more information: https://github.com/BenjaminBrandmeier/angular2-image-gallery/blob/master/docs/externalDataSource.md,\n\nOriginal error: " + err) :
                        console.error("Did you run the convert script from angular2-image-gallery for your images first? Original error: " + err);
                    this.gallery = []
                },
                () => undefined)
    }

    private render() {
        this.gallery = []

        let tempRow = [this.images[0]]
        let rowIndex = 0
        let i = 0

        for (i; i < this.images.length; i++) {
            while (this.images[i + 1] && this.shouldAddCandidate(tempRow, this.images[i + 1])) {
                i++
            }
            if (this.images[i + 1]) {
                tempRow.pop()
            }
            this.gallery[rowIndex++] = tempRow

            tempRow = [this.images[i + 1]]
        }

        this.scaleGallery()
    }

    public downloadImage(path:string, name:string){
        this.ImageService.downloadImage(path)
            .subscribe(imageFile => {
                let downloadUrl= window.URL.createObjectURL(imageFile);
                let anchor = document.createElement("a");
                anchor.download = name;
                anchor.href = downloadUrl;
                anchor.click();
            });
    }

    public parseExifData(img: any): string {
        let exifData: any = img['exifData'];
        let tags: any[] = img['tags'];
        if(exifData === null || exifData=== undefined){
            return null;
        }
        let exifHtml:string = "";
        if(exifData['cameraModel'])
            exifHtml += 'Camera Model: ' + exifData['cameraModel'] + '<br/>';
        if(exifData['cameraModel'])
            exifHtml += 'Created: ' + this.parseDate(exifData['recordedDate']) + '<br/>';
        if(exifData['cameraModel'])
            exifHtml += 'Size: ' + exifData['width'] + 'x' + exifData['height'] + '<br/>'
        if(exifData['cameraModel'])
            exifHtml += 'Orientation: ' + exifData['orientation'] + '<br/>';
        if(tags && tags.length != 0){
            exifHtml += 'tags: ';
            for(let tag of tags){
                exifHtml += '<span class="badge badge-info">' + tag.name + '</span>'
            }
        }
        return exifHtml;
    }

    private parseDate(timestamp: number) {
        let date = new Date(timestamp);
        return date.getFullYear() + "-" + this.pad(date.getMonth() + 1, 2) + "-" + this.pad(date.getDate(),2) + " " + date.getHours() + ":" + date.getMinutes();
    }

    private pad(num, size) {
        let s = "000000000" + num;
        return s.substr(s.length - size);
    }

    private shouldAddCandidate(imgRow: any[], candidate: any): boolean {
        let oldDifference = this.calcIdealHeight() - this.calcRowHeight(imgRow)
        imgRow.push(candidate)
        let newDifference = this.calcIdealHeight() - this.calcRowHeight(imgRow)

        return Math.abs(oldDifference) > Math.abs(newDifference)
    }

    private calcRowHeight(imgRow: any[]) {
        let originalRowWidth = this.calcOriginalRowWidth(imgRow)

        let ratio = (this.getGalleryWidth() - (imgRow.length - 1) * this.calcImageMargin()) / originalRowWidth
        let rowHeight = imgRow[0][this.minimalQualityCategory]['height'] * ratio

        return rowHeight
    }

    private calcImageMargin() {
        let galleryWidth = this.getGalleryWidth()
        let ratio = galleryWidth / 1920
        return Math.round(Math.max(1, this.providedImageMargin * ratio))
    }

    private calcOriginalRowWidth(imgRow: any[]) {
        let originalRowWidth = 0
        imgRow.forEach((img) => {
            let individualRatio = this.calcIdealHeight() / img[this.minimalQualityCategory]['height']
            img[this.minimalQualityCategory]['width'] = img[this.minimalQualityCategory]['width'] * individualRatio
            img[this.minimalQualityCategory]['height'] = this.calcIdealHeight()
            originalRowWidth += img[this.minimalQualityCategory]['width']
        })

        return originalRowWidth
    }

    private calcIdealHeight() {
        return this.getGalleryWidth() / (80 / this.providedImageSize) + 100
    }

    private getGalleryWidth() {
        if (this.galleryContainer.nativeElement.clientWidth === 0) {
            // IE11
            return this.galleryContainer.nativeElement.scrollWidth
        }
        return this.galleryContainer.nativeElement.clientWidth
    }

    private scaleGallery() {
        let imageCounter = 0
        let maximumGalleryImageHeight = 0

        this.gallery.forEach((imgRow) => {
            let originalRowWidth = this.calcOriginalRowWidth(imgRow)

            if (imgRow !== this.gallery[this.gallery.length - 1]) {
                let ratio = (this.getGalleryWidth() - (imgRow.length - 1) * this.calcImageMargin()) / originalRowWidth

                imgRow.forEach((img: any) => {
                    img['width'] = img[this.minimalQualityCategory]['width'] * ratio
                    img['height'] = img[this.minimalQualityCategory]['height'] * ratio
                    maximumGalleryImageHeight = Math.max(maximumGalleryImageHeight, img['height'])
                    this.checkForAsyncLoading(img, imageCounter++)
                })
            }
            else {
                imgRow.forEach((img: any) => {
                    img.width = img[this.minimalQualityCategory]['width']
                    img.height = img[this.minimalQualityCategory]['height']
                    maximumGalleryImageHeight = Math.max(maximumGalleryImageHeight, img['height'])
                    this.checkForAsyncLoading(img, imageCounter++)
                })
            }
        })

        if (maximumGalleryImageHeight > 375) {
            this.minimalQualityCategory = 'preview_xs'
        } else {
            this.minimalQualityCategory = 'preview_xxs'
        }

        this.ChangeDetectorRef.detectChanges()
    }

    private checkForAsyncLoading(image: any, imageCounter: number) {
        let imageElements = this.imageElements.toArray()

        if (image['galleryImageLoaded'] ||
            (imageElements.length > 0 && imageElements.length > imageCounter && this.isScrolledIntoView(imageElements[imageCounter].nativeElement))) {
            image['galleryImageLoaded'] = true
            image['srcAfterFocus'] = image[this.minimalQualityCategory]['path']
        }
        else {
            image['srcAfterFocus'] = ''
        }
    }

    private isScrolledIntoView(element: any) {
        let elementTop = element.getBoundingClientRect().top
        let elementBottom = element.getBoundingClientRect().bottom

        return elementTop < window.innerHeight && elementBottom >= 0 && (elementBottom > 0 || elementTop > 0)
    }
}

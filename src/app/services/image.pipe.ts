import {Pipe, PipeTransform} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';
import {HttpClient} from "@angular/common/http";

@Pipe({name: 'image'})
export class ImagePipe implements PipeTransform {
  constructor(private http: HttpClient) {}

  transform(url: string) {
    if(url === "")
      return url;
    return this.http.get(url, {responseType: "blob"}) // specify that response should be treated as blob data
      .switchMap(blob => {
        // return new observable which emits a base64 string when blob is converted to base64
        return Observable.create(observer => {
          const  reader = new FileReader();
          reader.readAsDataURL(blob); // convert blob to base64
          reader.onloadend = function() {
            observer.next(reader.result); // emit the base64 string result
          }
        });
      });
  }
}

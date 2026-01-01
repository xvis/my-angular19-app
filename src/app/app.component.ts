import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,FormsModule,CommonModule],
  template:  `
    <div class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-xl text-center border-t-4 border-blue-500">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">File POC</h1>
        <p class="text-gray-600 mb-8">Upload and download files from a backend REST API.</p>

        <!-- File Upload Section -->
        <div class="mb-6">
          <label for="fileInput" class="cursor-pointer bg-blue-500 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
            {{ selectedFile() ? 'Change File' : 'Select a File' }}
          </label>
          <input
            id="fileInput"
            type="file"
            (change)="onFileSelected($event)"
            class="hidden"
          >
          @if (selectedFile()) {
            <p class="mt-4 text-gray-700">Selected File: <span class="font-medium">{{ selectedFile()!.name }}</span></p>
          }
        </div>

        <!-- Action Buttons & Status -->
        <div class="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <button
            (click)="uploadFile()"
            [disabled]="!selectedFile() || isUploading()"
            class="w-full sm:w-auto bg-green-500 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            @if (isUploading()) {
              <div class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </div>
            } @else {
              Upload File
            }
          </button>
          
          <div class="w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="downloadFilename"
              placeholder="Enter filename to download"
              class="w-full py-2 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
          </div>
          
          <button
            (click)="downloadFile()"
            [disabled]="!downloadFilename"
            class="w-full sm:w-auto bg-blue-500 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Download File
          </button>
        </div>

        @if (message()) {
          <div class="p-4 rounded-lg text-sm"
               [ngClass]="{
                 'bg-green-100 text-green-700': messageType() === 'success',
                 'bg-red-100 text-red-700': messageType() === 'error'
               }">
            {{ message() }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      font-family: 'Inter', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
  `],
  styleUrl: './app.component.css'
})
// @viewChild('id') :child
export class AppComponent {
  // constructor(private http: HttpClient) {}
  private readonly apiUrl = 'http://localhost:8080/api/files';

  selectedFile = signal<File | null>(null);
  downloadFilename = '';
  isUploading = signal(false);
  message = signal('');
  messageType = signal<'success' | 'error'>('success');

  constructor(private http: HttpClient) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      this.message.set('');
    } else {
      this.selectedFile.set(null);
    }
  }

  uploadFile() {
    if (!this.selectedFile()) {
      this.message.set('Please select a file to upload.');
      this.messageType.set('error');
      return;
    }

    this.isUploading.set(true);
    const formData = new FormData();
    formData.append('file', this.selectedFile()!);

    this.http.post(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'text' // Add this line to handle text response
    }).subscribe({
      next: (event: any) => {
        if (event.type === 4) { // HttpEventType.Response
          this.isUploading.set(false);
          this.message.set(`File "${this.selectedFile()!.name}" uploaded successfully!`);
          this.messageType.set('success');
          this.downloadFilename = this.selectedFile()!.name;
          this.selectedFile.set(null);
        }
      },
      error: (error) => {
        this.isUploading.set(false);
        this.message.set('Upload failed. Please check the backend connection.');
        this.messageType.set('error');
        console.error('Upload Error:', error);
      }
    });
  }

  downloadFile() {
    if (!this.downloadFilename) {
      this.message.set('Please enter a filename to download.');
      this.messageType.set('error');
      return;
    }

    this.http.get(`${this.apiUrl}/download/${this.downloadFilename}`, {
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = this.downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        this.message.set(`File "${this.downloadFilename}" downloaded successfully!`);
        this.messageType.set('success');
      },
      error: (error) => {
        this.message.set(`Download failed. File not found or a server error occurred.`);
        this.messageType.set('error');
        console.error('Download Error:', error);
      }
    });
  }
}

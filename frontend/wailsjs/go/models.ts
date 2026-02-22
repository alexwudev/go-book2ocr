export namespace app {
	
	export class AppConfig {
	    credFile: string;
	    languages: string[];
	    concurrency: number;
	    outputDir: string;
	    mergePdf: boolean;
	    mergeFilename: string;
	    theme: string;
	    scanMode: string;
	    uiLang: string;
	    provider: string;
	    ocrSpaceApiKey: string;
	    ocrSpaceEngine: number;
	    ocrSpacePlan: string;
	    tesseractPath: string;
	    imageDir: string;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.credFile = source["credFile"];
	        this.languages = source["languages"];
	        this.concurrency = source["concurrency"];
	        this.outputDir = source["outputDir"];
	        this.mergePdf = source["mergePdf"];
	        this.mergeFilename = source["mergeFilename"];
	        this.theme = source["theme"];
	        this.scanMode = source["scanMode"];
	        this.uiLang = source["uiLang"];
	        this.provider = source["provider"];
	        this.ocrSpaceApiKey = source["ocrSpaceApiKey"];
	        this.ocrSpaceEngine = source["ocrSpaceEngine"];
	        this.ocrSpacePlan = source["ocrSpacePlan"];
	        this.tesseractPath = source["tesseractPath"];
	        this.imageDir = source["imageDir"];
	    }
	}
	export class ImageInfo {
	    originalPath: string;
	    originalName: string;
	    index: number;
	    pageType: string;
	    leftPageOverride: number;
	
	    static createFrom(source: any = {}) {
	        return new ImageInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.originalPath = source["originalPath"];
	        this.originalName = source["originalName"];
	        this.index = source["index"];
	        this.pageType = source["pageType"];
	        this.leftPageOverride = source["leftPageOverride"];
	    }
	}
	export class ImageMetadata {
	    path: string;
	    name: string;
	    width: number;
	    height: number;
	    fileSize: number;
	
	    static createFrom(source: any = {}) {
	        return new ImageMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.fileSize = source["fileSize"];
	    }
	}
	export class LangOption {
	    display: string;
	    code: string;
	
	    static createFrom(source: any = {}) {
	        return new LangOption(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.display = source["display"];
	        this.code = source["code"];
	    }
	}
	export class OCRSettings {
	    imageDir: string;
	    outputDir: string;
	    credFile: string;
	    languages: string[];
	    concurrency: number;
	    mergePdf: boolean;
	    mergeFilename: string;
	    scanMode: string;
	    provider: string;
	    ocrSpaceApiKey: string;
	    ocrSpaceEngine: number;
	    ocrSpacePlan: string;
	    tesseractPath: string;
	    selectedFiles: string[];
	
	    static createFrom(source: any = {}) {
	        return new OCRSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.imageDir = source["imageDir"];
	        this.outputDir = source["outputDir"];
	        this.credFile = source["credFile"];
	        this.languages = source["languages"];
	        this.concurrency = source["concurrency"];
	        this.mergePdf = source["mergePdf"];
	        this.mergeFilename = source["mergeFilename"];
	        this.scanMode = source["scanMode"];
	        this.provider = source["provider"];
	        this.ocrSpaceApiKey = source["ocrSpaceApiKey"];
	        this.ocrSpaceEngine = source["ocrSpaceEngine"];
	        this.ocrSpacePlan = source["ocrSpacePlan"];
	        this.tesseractPath = source["tesseractPath"];
	        this.selectedFiles = source["selectedFiles"];
	    }
	}
	export class RenamePreview {
	    originalName: string;
	    newName: string;
	    leftPage: string;
	    rightPage: string;
	    pageType: string;
	
	    static createFrom(source: any = {}) {
	        return new RenamePreview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.originalName = source["originalName"];
	        this.newName = source["newName"];
	        this.leftPage = source["leftPage"];
	        this.rightPage = source["rightPage"];
	        this.pageType = source["pageType"];
	    }
	}
	export class Session {
	    imageDir: string;
	    outputDir: string;
	    credFile: string;
	    languages: string[];
	    concurrency: number;
	    mergePdf: boolean;
	    mergeFilename: string;
	    scanMode: string;
	    totalFiles: number;
	    processedFiles: string[];
	    provider: string;
	    ocrSpaceApiKey: string;
	    ocrSpaceEngine: number;
	    ocrSpacePlan: string;
	    tesseractPath: string;
	    selectedFiles: string[];
	
	    static createFrom(source: any = {}) {
	        return new Session(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.imageDir = source["imageDir"];
	        this.outputDir = source["outputDir"];
	        this.credFile = source["credFile"];
	        this.languages = source["languages"];
	        this.concurrency = source["concurrency"];
	        this.mergePdf = source["mergePdf"];
	        this.mergeFilename = source["mergeFilename"];
	        this.scanMode = source["scanMode"];
	        this.totalFiles = source["totalFiles"];
	        this.processedFiles = source["processedFiles"];
	        this.provider = source["provider"];
	        this.ocrSpaceApiKey = source["ocrSpaceApiKey"];
	        this.ocrSpaceEngine = source["ocrSpaceEngine"];
	        this.ocrSpacePlan = source["ocrSpacePlan"];
	        this.tesseractPath = source["tesseractPath"];
	        this.selectedFiles = source["selectedFiles"];
	    }
	}
	export class UsageRecord {
	    date: string;
	    provider: string;
	    plan: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new UsageRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.provider = source["provider"];
	        this.plan = source["plan"];
	        this.count = source["count"];
	    }
	}
	export class UsageStats {
	    records: UsageRecord[];
	
	    static createFrom(source: any = {}) {
	        return new UsageStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.records = this.convertValues(source["records"], UsageRecord);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}


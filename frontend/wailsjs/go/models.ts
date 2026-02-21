export namespace main {
	
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
	    }
	}
	export class ImageInfo {
	    originalPath: string;
	    originalName: string;
	    index: number;
	    pageType: string;
	    isRoman: boolean;
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
	        this.isRoman = source["isRoman"];
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
	    }
	}

}


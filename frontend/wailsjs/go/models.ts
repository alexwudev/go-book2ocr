export namespace main {
	
	export class AppConfig {
	    credFile: string;
	    languages: string[];
	    concurrency: number;
	    outputDir: string;
	    mergePdf: boolean;
	    mergeFilename: string;
	    theme: string;
	
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
	    }
	}
	export class ImageInfo {
	    originalPath: string;
	    originalName: string;
	    index: number;
	    pageType: string;
	    isRoman: boolean;
	
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
	        this.totalFiles = source["totalFiles"];
	        this.processedFiles = source["processedFiles"];
	    }
	}

}


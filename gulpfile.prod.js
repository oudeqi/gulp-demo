const gulp = require('gulp');
const gulpLoadPlugins = require( 'gulp-load-plugins');
const browserSync = require('browser-sync');
const minifyCss = require('gulp-clean-css');
const pngquant = require('imagemin-pngquant'); //png图片压缩插件
const spritesmith = require('gulp.spritesmith');
const buffer = require('vinyl-buffer');
const merge = require('merge-stream');
const fileinclude = require('gulp-file-include');
const revReplace = require('gulp-rev-replace');
const runSequence = require('run-sequence');
const processors = require('./postcss.config.js');

const NODE_ENV = process.env.NODE_ENV;
console.log('NODE_ENV-------------------------');
console.log(NODE_ENV);

const $ = gulpLoadPlugins();

gulp.task('build:clean', ()=> {
    return gulp.src('build/', {read: false})
    .pipe($.clean());
});

gulp.task('build:images', ()=> {
	return gulp.src('dist/img/*.*')
	.pipe($.cache($.imagemin({
				optimizationLevel: 3,
				progressive: true, 
				interlaced: true,
				use: [pngquant()]
			})
		))
	.pipe(gulp.dest('build/img/'));
});

gulp.task('build:styles', ()=> {
	return gulp.src('dist/css/*.css')
	.pipe(minifyCss())
	.pipe(gulp.dest('build/css/'));
});

gulp.task('build:scripts', ()=> {
	return gulp.src('dist/js/*.js')
	.pipe($.uglify().on('error', function(e){
		console.log(e);
	}))
	.pipe(gulp.dest('build/js/'));
});

gulp.task('useref', ['build:styles', 'build:scripts'], ()=> {
    let options = {
        removeComments: false,//清除HTML注释
        collapseWhitespace: true,//压缩HTML
        collapseBooleanAttributes: false,//省略布尔属性的值 <input checked="true"/> ==> <input />
        removeEmptyAttributes: false,//删除所有空格作属性值 <input id="" /> ==> <input />
        removeScriptTypeAttributes: false,//删除<script>的type="text/javascript"
        removeStyleLinkTypeAttributes: false,//删除<style>和<link>的type="text/css"
        minifyJS: false,//压缩页面里的JS
        minifyCSS: false//压缩页面里的CSS
    };
    return gulp.src('dist/*.html')
        .pipe($.plumber())
        .pipe($.useref({searchPath: ['app/', 'node_modules/']}))
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css', minifyCss()))
        .pipe($.if('*.html', $.htmlmin(options)))
        .pipe(gulp.dest('build/'));
});

gulp.task('rev', ['useref'], ()=> {
    return gulp.src([
    	'build/css/*.css', 
    	'build/js/*.js', 
    	'build/img/*.*',
    	'build/common/*.*'
    ], {base: 'build/'})
    .pipe($.rev())
    .pipe(gulp.dest('build/'))
    .pipe($.rev.manifest({
        merge: true
    }))
    .pipe(gulp.dest('build/'));
});

gulp.task('replacerev', ['rev'], ()=> {
  var manifest = gulp.src('build/rev-manifest.json');
  return gulp.src([
  		'build/*.html',
  		'build/css/*.css', 
  		'build/js/*.js', 
  		'build/common/*.*'
  	], {base: 'build'})
    .pipe(revReplace({manifest: manifest}))
    .pipe(gulp.dest('build/'));
});

gulp.task('size', ()=>{
    return gulp.src('build/**/*')
    	.pipe($.size({title:'build', gzip:true}));
});

gulp.task('build', ['build:clean'], ()=> {
	browserSync({
         server: 'build/'
    });
	return runSequence('build:images', 'replacerev', 'size');
});

gulp.task('default', ()=> {
    gulp.start('build');
});
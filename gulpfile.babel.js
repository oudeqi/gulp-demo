import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import minifyCss from 'gulp-clean-css';
import pngquant from 'imagemin-pngquant'; //png图片压缩插件
import spritesmith from 'gulp.spritesmith';
import buffer from 'vinyl-buffer';
import merge from 'merge-stream';
import fileinclude from 'gulp-file-include';
import revReplace from 'gulp-rev-replace';
import runSequence from 'run-sequence';
import processors from './postcss.config.js';

const $ = gulpLoadPlugins();

gulp.task('clean', ()=> {
	return gulp.src(['dist/', 'build/'], {read: false})
		.pipe($.clean());
});

gulp.task('scripts', ()=> {
    return gulp.src('app/js/*.js')
        .pipe($.plumber())
        // .pipe($.sourcemaps.init())
        // .pipe($.babel())
        // .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('dist/js/'));
});

gulp.task('styles', ()=> {
	return gulp.src('app/css/*.css')
		.pipe($.plumber())
		.pipe($.sourcemaps.init())
		.pipe($.postcss(processors))
		// .pipe(minifyCss())
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest('dist/css/'));
});

gulp.task('images', ()=> {
	return gulp.src('app/img/*.*')
		.pipe(gulp.dest ('dist/img/'));
});

gulp.task('html', ()=> {
    return gulp.src('app/*.html')
        .pipe(fileinclude({
			prefix: '@@',
			basepath: '@file',
			context: {
				hasFooter: true,
				arr: ['test1', 'test2']
			}
		}))
        .pipe(gulp.dest('dist/'));
});

gulp.task('sprite', ()=> {
	let spriteData = gulp.src(['app/sprite/*.png','!app/sprite/*@3x.png'])
	.pipe(spritesmith({
		imgName: 'sprite.png',
    	imgPath: "../img/sprite.png",
		cssName: 'sprite.css',
		cssFormat: 'css',
    	padding: 10,
    	cssTemplate: './handlebarsStr.css.handlebars'
	}));
	let imgStream = spriteData.img
	.pipe(gulp.dest('dist/img/'));
	let cssStream = spriteData.css
	.pipe($.postcss([require('postcss-calc')]))
	.pipe(gulp.dest('dist/css/'));
	return merge(imgStream, cssStream);
});

gulp.task('server', ['html', 'styles', 'scripts', 'sprite', 'images'], ()=> {
    browserSync({
        notify : false,
        port:3000,
        server:{
            baseDir:['dist/', 'node_modules/'], //确定根目录,可以指定多个
        }
    });
    gulp.watch(['app/*.html'], ['html']).on('change', browserSync.reload);
    gulp.watch(['app/css/*.css'], ['styles']).on('change', browserSync.reload);
    gulp.watch(['app/js/*.js'], ['scripts']).on('change', browserSync.reload);
    gulp.watch(['app/sprite/*.*'], ['sprite']).on('change', browserSync.reload);
    gulp.watch(['app/img/*.*'], ['images']).on('change', browserSync.reload);
});

gulp.task('default', ['clean'], ()=> {
    gulp.start('server');
});

// ----------------------------------------------------- build

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
	let manifest = gulp.src('build/rev-manifest.json');
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

// ----------------------------------------------------- 备用

gulp.task('concat', ()=> {
    gulp.src('src/js/*.js')
    .pipe(concat('all.js'))
    .pipe(gulp.dest('dest/js/'));
});

gulp.task("browserify", ()=> {
    let b = browserify({
        entries: "dist/js/app.js"
    });
    return b.bundle()
        .pipe(source("bundle.js"))
        .pipe(gulp.dest("dist/js/"));
});

// .pipe($.replace('.js"></script>' , '.js?v=' + version + '"></script>'))
// .pipe($.replace('.css">' , '.css?v=' + version + '">')) // TODO
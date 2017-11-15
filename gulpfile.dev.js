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

gulp.task('clean', ()=> {
	return gulp.src(['dist/', 'build/'], {read: false})
		.pipe($.clean());
});

gulp.task('scripts', ()=> {
    return gulp.src('app/js/*.js')
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.babel())
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('dist/js/'));
});

gulp.task('styles', ()=> {
	return gulp.src(['app/css/*.css', 'app/css-helper/*.css', 'app/include/**/*.css'])
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
    gulp.watch(['app/*.html', 'app/include/**/*.html'], ['html']).on('change', browserSync.reload);
    gulp.watch(['app/css/*.css', 'app/css-helper/*.css', 'app/include/**/*.css'], ['styles']).on('change', browserSync.reload);
    gulp.watch(['app/js/*.js'], ['scripts']).on('change', browserSync.reload);
    gulp.watch(['app/sprite/*.*'], ['sprite']).on('change', browserSync.reload);
    gulp.watch(['app/img/*.*'], ['images']).on('change', browserSync.reload);
});

gulp.task('default', ['clean'], ()=> {
    gulp.start('server');
});

'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');


gulp.task('build', ['compress']);

gulp.task('compress', function()
{
  return gulp.src('lib/*.js')
  .pipe(uglify())
  .pipe(gulp.dest('min'))
  .on('error', function(e)
  {
    console.log(e.message);
  });
});


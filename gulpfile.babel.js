import gulp from "gulp";
import cp from "child_process";
import gutil from "gulp-util";
import postcss from "gulp-postcss";
import cssImport from "postcss-import";
import neatgrid from "postcss-neat";
import nestedcss from "postcss-nested";
import colorfunctions from "postcss-sass-color-functions";
import hdBackgrounds from "postcss-at2x";
import cssvars from "postcss-simple-vars-async";
import cssextend from "postcss-simple-extend";
import styleVariables from "./config/variables";
import BrowserSync from "browser-sync";
import reduce from "gulp-reduce-async";
import rename from "gulp-rename";
import S from "string";
import webpack from "webpack";
import webpackConfig from "./webpack.conf";
import runSequence from "run-sequence";

const browserSync = BrowserSync.create();
const hugoBin = "hugo";
const defaultArgs = ["-d", "../dist", "-s", "site", "-v"];

gulp.task("hugo", (cb) => buildSite(cb));
gulp.task("hugo-preview", (cb) => buildSite(cb, ["--buildDrafts", "--buildFuture"]));

gulp.task("css", () => (
  gulp.src("./src/css/*.css")
    .pipe(postcss([
      cssImport({from: "./src/css/main.css"}),
      neatgrid(),
      nestedcss(),
      hdBackgrounds(),
      cssextend(),
      cssvars({variables: styleVariables}),
      colorfunctions()]))
    .pipe(gulp.dest("./dist/css"))
    .pipe(browserSync.stream())
));

gulp.task("js", (cb) => {
  const myConfig = Object.assign({}, webpackConfig);

  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      colors: true,
      progress: true
    }));
    browserSync.reload();
    cb();
  });

  gulp.src(["./src/js/**/*", "!./src/js/app.js"])
    .pipe(gulp.dest("./dist/js"))
    .pipe(browserSync.stream())
});

gulp.task("fonts", () => (
  gulp.src("./src/fonts/**/*")
    .pipe(gulp.dest("./dist/fonts"))
    .pipe(browserSync.stream())
));

gulp.task("src-root", () => (
  gulp.src("./src/*")
    .pipe(gulp.dest("./dist"))
    .pipe(browserSync.stream())
));

gulp.task("images", () => (
  gulp.src("./src/img/**/*")
    .pipe(gulp.dest("./dist/img"))
    .pipe(browserSync.stream())
));

gulp.task('server', gulp.series("hugo", "css", "js", "fonts", "src-root", "images", function(){
  browserSync.init({
    server: {
      baseDir: "./dist"
    },
    notify: false
  });
  gulp.watch("./src/js/**/*.js", gulp.series('js'));
  gulp.watch("./src/css/**/*.css", gulp.series('css'));
  gulp.watch("./src/img/**/*", gulp.series('images'));
  gulp.watch("./src/fonts/**/*", gulp.series('fonts'));
  gulp.watch("./src/*", gulp.series('src-root'));
  gulp.watch("./site/**/*", gulp.series('hugo'));
}));

gulp.task("index-site", (cb) => {

  var pagesIndex = [];

  return gulp.src("dist/**/*.html")
    .pipe(reduce(function(memo, content, file, cb) {

      var section      = S(file.path).chompLeft(file.cwd + "/dist").between("/", "/").s,
          title        = S(content).between("<title>", "</title>").collapseWhitespace().chompRight(" | Dusk Digital").s,
          pageContent  = S(content).collapseWhitespace().between('search-results">', '<footer class="footer').stripTags().collapseWhitespace().s,
          href         = S(file.path).chompLeft(file.cwd + "/dist").s,
          pageInfo     = new Object(),
          isRestricted = false,
          blacklist    = [
            "/page/",
            "/tags/",
            "/google2bc58d5c439bc9bf",
            "/google9809c51e1efe86a0",
            "/pages/index.html",
            "/thanks",
            "404"
          ];

      // fixes homepage title
      if (href === "/index.html") {
        title = "Homepage";
      }

      // remove trailing 'index.html' from qualified paths
      if (href.indexOf('/index.html') !== -1) {
        href = S(href).strip('index.html').s;
      }

      // determine if this file is restricted
      for (let ignoredString of blacklist) {
        if (href.indexOf(ignoredString) !== -1) {
          // console.log('ignored: ' + href + ' because of ' + ignoredString);
          isRestricted = true;
          break;
        }
      }

      // only push files that aren't ignored
      if (!isRestricted) {
        pageInfo["section"] = section;
        pageInfo["title"]   = title;
        pageInfo["href"]    = href;

        pageInfo["content"] = pageContent;

        pagesIndex.push(pageInfo);
      }

      cb(null, JSON.stringify(pagesIndex));
    }, "{}"))
    .pipe(rename("PagesIndex.json"))
    .pipe(gulp.dest("./dist/js/lunr"));
});

function buildSite(cb, options) {
  const args = options ? defaultArgs.concat(options) : defaultArgs;

  return cp.spawn(hugoBin, args, {stdio: "inherit"}).on("close", (code) => {
    if (code === 0) {
      browserSync.reload();
      cb();
    } else {
      browserSync.notify("Hugo build failed :(");
      cb("Hugo build failed");
    }
  });
}

gulp.task('build', gulp.series("css", "js", "fonts", "src-root", "images", "hugo", "index-site"));
gulp.task('build-preview', gulp.series("css", "js", "fonts", "src-root", "images", "hugo-preview", "index-site"));

'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    typescript: {
      // Client side code uses amd modules and require.js.
      client: {
        src: [
          'src/*.ts'
        ],
        dest: 'dist',
        options: {
          target: 'es5',
          basePath: 'src',
          sourcemap: false,
          declaration: false,
          comments: true
        }
      }
    },

    stylus: {
      production: {
        options: {
          urlfunc: 'embedurl'
        },
        files: {
          'dist/x-video.css': ['src/x-video.styl', 'src/x-menu.styl']
        }
      }
    },

    concat: {
      options: {
      },
      dist: {
        src: ['dist/x-video.js', 'dist/x-menu.js'],
        dest: 'dist/x-video.complete.js'
      }
    },

    copy: {
      main: {
        files: [
          {expand: true, flatten: true, src: ['dist/x-video.complete.js'], dest: 'demo/js/', filter: 'isFile'},
          {expand: true, flatten: true, src: ['dist/x-video.css'], dest: 'demo/css/', filter: 'isFile'}
        ]
      }
    },

    'gh-pages': {
      options: {
        base: 'demo'
      },
      src: ['**']
    },

    // Recompile to JavaScript when a file changes.
    watch: {
      client: {
        files: [
          'src/*.ts'
        ],
        tasks: ['typescript:client'],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-contrib-stylus');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-gh-pages');
  //grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('build', ['typescript', 'stylus', 'concat', 'copy']);
  grunt.registerTask('deploy', ['build', 'gh-pages']);
};

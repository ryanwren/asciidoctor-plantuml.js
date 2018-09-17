/* eslint-env jasmine */
/* global Opal */
const asciidoctorPlantuml = require('../src/asciidoctor-plantuml.js')
const plantumlEncoder = require('plantuml-encoder')
const asciidoctor = require('asciidoctor.js')()
const cheerio = require('cheerio')

const registry = asciidoctorPlantuml.register(asciidoctor.Extensions.create())

// Namespace
const sharedSpec = {}

sharedSpec.DIAGRAM_SRC = `@startuml
alice -> bob
@enduml`
sharedSpec.LOCAL_URL = 'http://localhost:8080'
sharedSpec.PLANTUML_REMOTE_URL = 'http://www.plantuml.com/plantuml'
sharedSpec.PNG_DIAGRAM_SIZE = 1785
sharedSpec.SVG_DIAGRAM_SIZE = 2629
sharedSpec.encodedDiagram = plantumlEncoder.encode(sharedSpec.DIAGRAM_SRC)

/**
 * Convert an AsciiDoc content to a "JQuery" DOM
 * @param asciidocContent
 */
sharedSpec.toJQueryDOM = (asciidocContent) => cheerio.load(asciidoctor.convert(asciidocContent, {extension_registry: registry}))

/**
 * Generate an AsciiDoc content containing a PlantUML diagram
 * @returns {string}
 */
sharedSpec.asciidocContent = (docAttrs = [], blockAttrs = [], blockStyleModifiers = '', blockDelimiter = '----') => `
${docAttrs.join('\n')}
[${['plantuml' + blockStyleModifiers].concat(blockAttrs || []).join(',')}]
${blockDelimiter}
${sharedSpec.DIAGRAM_SRC}
${blockDelimiter}
`
/**
 * Run the tests
 */
sharedSpec.run = function () {
  describe('extension registration', () => {
    let registry

    let registeredForBlock = (context) => Opal.send(registry, 'registered_for_block?', ['plantuml', context])

    beforeEach(() => (registry = asciidoctor.Extensions.create()))

    it('should register plantuml style for listing block', () => {
      expect(() => registeredForBlock('listing')).toThrowError(/undefined method/)
      asciidoctorPlantuml.register(registry)
      expect(registeredForBlock('listing')).not.toBeNull()
    })

    it('should register plantuml style for literal block', () => {
      expect(() => registeredForBlock('literal')).toThrowError(/undefined method/)
      asciidoctorPlantuml.register(registry)
      expect(registeredForBlock('literal')).not.toBeNull()
    })
  })

  describe('conversion to HTML', () => {
    let encodedDiagram = plantumlEncoder.encode(sharedSpec.DIAGRAM_SRC)

    it('should create div[class="imageblock plantuml"] with img inside from listing block', () => {
      const root = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`]))('.imageblock.plantuml')
      expect(root.find('div.content img').length).toBe(1)
    })

    it('should create div[class="imageblock plantuml"] with img inside from literal block', () => {
      const root = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], [], '', '....'))('.imageblock.plantuml')
      expect(root.find('div.content img').length).toBe(1)
    })

    describe('diagram attributes', () => {
      it('should populate id from named attr', () => {
        const imageBlock = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], ['id=myId']))('.imageblock.plantuml')
        expect(imageBlock.attr('id')).toBe('myId')
      })

      it('should populate id from block style modifier', () => {
        const imageBlock = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], [], '#myId'))('.imageblock.plantuml')
        expect(imageBlock.attr('id')).toBe('myId')
      })

      it('should populate role from named attr', () => {
        const imageBlock = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], ['role=sequence']))('.imageblock.plantuml')
        expect(imageBlock.attr('class')).toBe('imageblock sequence plantuml')
      })

      it('should populate role from block style modifier', () => {
        const imageBlock = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], [], '.sequence'))('.imageblock.plantuml')
        expect(imageBlock.attr('class')).toBe('imageblock sequence plantuml')
      })

      it('should set alt attribute on image', () => {
        const img = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`]))('.imageblock.plantuml img')
        expect(img.attr('alt')).toBe('diagram')
      })

      it('should set alt attribute on image from positional attr :target:', () => {
        const img = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], ['myFile']))('.imageblock.plantuml img')
        expect(img.attr('alt')).toBe('myFile')
      })
    })

    describe('PlantUML server URL', () => {
      it('should use :plantuml-server-url: for diagram src', () => {
        const src = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`]))('.imageblock.plantuml img').attr('src')
        expect(src).toBe(`${sharedSpec.LOCAL_URL}/png/${encodedDiagram}`)
      })

      it('should generate HTML error when no :plantuml-server-url: and no PLANTUML_SERVER_URL for listing block', () => {
        const listingBlock = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent())('.listingblock.plantuml-error')
        expect(listingBlock.find('img').length).toBe(0)
        expect(listingBlock.text()).toContain('@startuml')
      })

      it('should generate HTML error when no :plantuml-server-url: and no PLANTUML_SERVER_URL for literal', () => {
        const literalBlock = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([], [], '', '....'))('.literalblock.plantuml-error')
        expect(literalBlock.find('img').length).toBe(0)
        expect(literalBlock.text()).toContain('@startuml')
      })
    })

    describe('PlantUML format', () => {
      it('should use png as default format for listing block', () => {
        const src = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], ['\'\''], '', '----'))('.imageblock.plantuml img').attr('src')
        expect(src).toBe(`${sharedSpec.LOCAL_URL}/png/${encodedDiagram}`)
      })

      it('should use png as default format for literal block', () => {
        const src = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], ['\'\''], '', '....'))('.imageblock.plantuml img').attr('src')
        expect(src).toBe(`${sharedSpec.LOCAL_URL}/png/${encodedDiagram}`)
      })

      it('should support explicit png format from positional attr', () => {
        const src = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], ['\'\'', 'png']))('.imageblock.plantuml img').attr('src')
        expect(src).toBe(`${sharedSpec.LOCAL_URL}/png/${encodedDiagram}`)
      })

      it('should support explicit svg format from positional attr', () => {
        const src = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], ['\'\'', 'svg']))('.imageblock.plantuml img').attr('src')
        expect(src).toBe(`${sharedSpec.LOCAL_URL}/svg/${encodedDiagram}`)
      })

      it('should support format from named attr', () => {
        const src = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], ['format=svg']))('.imageblock.plantuml img').attr('src')
        expect(src).toBe(`${sharedSpec.LOCAL_URL}/svg/${encodedDiagram}`)
      })

      it('should generate HTML error when unsupported format used', () => {
        const listingBlock = sharedSpec.toJQueryDOM(sharedSpec.asciidocContent([`:plantuml-server-url: ${sharedSpec.LOCAL_URL}`], ['\'\'', 'qwe']))('.listingblock.plantuml-error')
        expect(listingBlock.find('img').length).toBe(0)
        expect(listingBlock.text()).toContain('@startuml')
      })
    })
  })
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = sharedSpec
}

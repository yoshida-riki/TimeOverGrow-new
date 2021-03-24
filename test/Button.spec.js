import { config } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import Vue from 'vue';
import Vuetify from 'vuetify';
import Button from '@/components/Button';

// コンソールエラーを非表示にする方法です。
config.showDeprecationWarnings = false

Vue.use(Vuetify);



describe('components/Button.vue', () => {
    it('handleClickが呼ばれるかどうか', () => {
        const handleClick = jest.fn()
        const wrapper = mount(Button, {
          methods: { handleClick }
        })

        wrapper.find('button').trigger('click')
        expect(handleClick).toBeCalled()
    })
})